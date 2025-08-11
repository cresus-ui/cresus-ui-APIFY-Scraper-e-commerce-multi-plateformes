const cheerio = require('cheerio');
const moment = require('moment');

class EbayScraper {
    static async scrape(page, type, searchTerm, maxProducts) {
        const products = [];
        
        try {
            // Attendre le chargement du contenu
            await page.waitForSelector('.s-item, .x-item-title-label', { timeout: 10000 });
            
            if (type === 'search') {
                return await this.scrapeSearchResults(page, maxProducts);
            } else if (type === 'product') {
                return await this.scrapeProductPage(page);
            }
            
        } catch (error) {
            console.error('Erreur eBay scraper:', error.message);
            return [];
        }
        
        return products;
    }
    
    static async scrapeSearchResults(page, maxProducts) {
        const products = [];
        let currentPage = 1;
        
        while (products.length < maxProducts) {
            console.log(`📄 eBay - Page ${currentPage}`);
            
            // Extraire les produits de la page actuelle
            const pageProducts = await page.evaluate(() => {
                const results = [];
                const productElements = document.querySelectorAll('.s-item:not(.s-item--watch-at-corner)');
                
                productElements.forEach(element => {
                    try {
                        const titleElement = element.querySelector('.s-item__title');
                        const priceElement = element.querySelector('.s-item__price');
                        const linkElement = element.querySelector('.s-item__link');
                        const imageElement = element.querySelector('.s-item__image img');
                        const conditionElement = element.querySelector('.SECONDARY_INFO');
                        const shippingElement = element.querySelector('.s-item__shipping');
                        
                        if (titleElement && linkElement) {
                            const product = {
                                title: titleElement.textContent?.trim() || '',
                                url: linkElement.href || '',
                                image: imageElement?.src || '',
                                condition: conditionElement?.textContent?.trim() || 'Unknown'
                            };
                            
                            // Extraction du prix
                            if (priceElement) {
                                const priceText = priceElement.textContent || '';
                                const priceMatch = priceText.match(/\$([0-9,]+\.?[0-9]*)/);                                
                                if (priceMatch) {
                                    product.price = parseFloat(priceMatch[1].replace(/,/g, ''));
                                    product.currency = 'USD';
                                }
                                
                                // Vérifier si c'est une enchère
                                if (priceText.toLowerCase().includes('bid')) {
                                    product.auctionType = 'auction';
                                } else {
                                    product.auctionType = 'buy_it_now';
                                }
                            }
                            
                            // Frais de livraison
                            if (shippingElement) {
                                const shippingText = shippingElement.textContent || '';
                                if (shippingText.toLowerCase().includes('free')) {
                                    product.shipping = 'Free';
                                } else {
                                    const shippingMatch = shippingText.match(/\$([0-9,]+\.?[0-9]*)/);                                    
                                    if (shippingMatch) {
                                        product.shipping = parseFloat(shippingMatch[1].replace(/,/g, ''));
                                    }
                                }
                            }
                            
                            // Disponibilité (eBay affiche généralement les articles disponibles)
                            product.availability = 'Available';
                            
                            // Localisation du vendeur
                            const locationElement = element.querySelector('.s-item__location');
                            product.sellerLocation = locationElement?.textContent?.trim() || '';
                            
                            if (product.title && product.url) {
                                results.push(product);
                            }
                        }
                    } catch (error) {
                        console.error('Erreur extraction produit eBay:', error);
                    }
                });
                
                return results;
            });
            
            products.push(...pageProducts);
            
            // Vérifier s'il y a une page suivante
            const nextButton = await page.$('.pagination__next:not(.pagination__next--disabled)');
            if (!nextButton || products.length >= maxProducts) {
                break;
            }
            
            // Aller à la page suivante
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
                nextButton.click()
            ]);
            
            currentPage++;
            
            // Délai entre les pages
            await page.waitForTimeout(2000);
        }
        
        return products.slice(0, maxProducts);
    }
    
    static async scrapeProductPage(page) {
        try {
            const product = await page.evaluate(() => {
                const result = {};
                
                // Titre du produit
                const titleElement = document.querySelector('.x-item-title-label, #ebay-item-title');
                result.title = titleElement?.textContent?.trim() || '';
                
                // Prix
                const priceElement = document.querySelector('.notranslate, .u-flL.condText');
                if (priceElement) {
                    const priceText = priceElement.textContent || '';
                    const priceMatch = priceText.match(/\$([0-9,]+\.?[0-9]*)/);                    
                    if (priceMatch) {
                        result.price = parseFloat(priceMatch[1].replace(/,/g, ''));
                        result.currency = 'USD';
                    }
                }
                
                // URL actuelle
                result.url = window.location.href;
                
                // Image principale
                const imageElement = document.querySelector('#icImg, .ux-image-magnify__container img');
                result.image = imageElement?.src || '';
                
                // Condition
                const conditionElement = document.querySelector('.u-flL.condText, .condition-value');
                result.condition = conditionElement?.textContent?.trim() || 'Unknown';
                
                // Quantité disponible
                const quantityElement = document.querySelector('.qtyTxt, .notranslate');
                if (quantityElement) {
                    const qtyText = quantityElement.textContent || '';
                    const qtyMatch = qtyText.match(/([0-9]+)\s*available/i);                    
                    if (qtyMatch) {
                        result.quantity = parseInt(qtyMatch[1]);
                        result.availability = result.quantity > 0 ? 'In Stock' : 'Out of Stock';
                    }
                } else {
                    result.availability = 'Available';
                }
                
                // Informations sur le vendeur
                const sellerElement = document.querySelector('.mbg-nw, .seller-persona-title');
                result.seller = sellerElement?.textContent?.trim() || '';
                
                const feedbackElement = document.querySelector('.mbg-l, .reviews .review-item-content');
                if (feedbackElement) {
                    const feedbackText = feedbackElement.textContent || '';
                    const feedbackMatch = feedbackText.match(/([0-9.]+)%/);                    
                    if (feedbackMatch) {
                        result.sellerFeedback = parseFloat(feedbackMatch[1]);
                    }
                }
                
                // Frais de livraison
                const shippingElement = document.querySelector('.vi-price .notranslate, .shipping-cost');
                if (shippingElement) {
                    const shippingText = shippingElement.textContent || '';
                    if (shippingText.toLowerCase().includes('free')) {
                        result.shipping = 'Free';
                    } else {
                        const shippingMatch = shippingText.match(/\$([0-9,]+\.?[0-9]*)/);                        
                        if (shippingMatch) {
                            result.shipping = parseFloat(shippingMatch[1].replace(/,/g, ''));
                        }
                    }
                }
                
                // Type d'annonce
                const auctionElement = document.querySelector('.notranslate');
                if (auctionElement && auctionElement.textContent.toLowerCase().includes('bid')) {
                    result.auctionType = 'auction';
                    
                    // Temps restant pour les enchères
                    const timeElement = document.querySelector('.timeMs, .timer');
                    result.timeLeft = timeElement?.textContent?.trim() || '';
                } else {
                    result.auctionType = 'buy_it_now';
                }
                
                // Description
                const descElement = document.querySelector('.item-description, .x-item-description');
                result.description = descElement?.textContent?.trim().substring(0, 500) || '';
                
                // Localisation
                const locationElement = document.querySelector('.iti-eu-bld-gry, .location-info');
                result.itemLocation = locationElement?.textContent?.trim() || '';
                
                return result;
            });
            
            return [product];
            
        } catch (error) {
            console.error('Erreur scraping page produit eBay:', error);
            return [];
        }
    }
    
    static async handleAntiBot(page) {
        try {
            // Vérifier s'il y a une vérification de sécurité
            const securityElement = await page.$('form[name="sec_captcha"]');
            if (securityElement) {
                console.log('⚠️ Vérification de sécurité détectée sur eBay');
                await page.waitForTimeout(5000);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Erreur vérification anti-bot eBay:', error);
            return true;
        }
    }
}

module.exports = EbayScraper;