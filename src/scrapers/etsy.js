const cheerio = require('cheerio');
const moment = require('moment');

class EtsyScraper {
    static async scrape(page, type, searchTerm, maxProducts) {
        const products = [];
        
        try {
            // Attendre le chargement du contenu
            await page.waitForSelector('[data-test-id="listing-card"], .listing-link', { timeout: 10000 });
            
            if (type === 'search') {
                return await this.scrapeSearchResults(page, maxProducts);
            } else if (type === 'product') {
                return await this.scrapeProductPage(page);
            }
            
        } catch (error) {
            console.error('Erreur Etsy scraper:', error.message);
            return [];
        }
        
        return products;
    }
    
    static async scrapeSearchResults(page, maxProducts) {
        const products = [];
        let currentPage = 1;
        
        while (products.length < maxProducts) {
            console.log(`📄 Etsy - Page ${currentPage}`);
            
            // Extraire les produits de la page actuelle
            const pageProducts = await page.evaluate(() => {
                const results = [];
                const productElements = document.querySelectorAll('[data-test-id="listing-card"], .listing-link');
                
                productElements.forEach(element => {
                    try {
                        const titleElement = element.querySelector('[data-test-id="listing-card-title"], .listing-link h3');
                        const priceElement = element.querySelector('.currency-value, [data-test-id="listing-card-price"]');
                        const linkElement = element.querySelector('a[href*="/listing/"]') || element;
                        const imageElement = element.querySelector('img');
                        const shopElement = element.querySelector('.shop-name, [data-test-id="shop-name"]');
                        const ratingElement = element.querySelector('.rating, [data-test-id="rating"]');
                        
                        if (titleElement && linkElement) {
                            const product = {
                                title: titleElement.textContent?.trim() || titleElement.getAttribute('title') || '',
                                url: linkElement.href ? new URL(linkElement.href, window.location.origin).href : '',
                                image: imageElement?.src || imageElement?.getAttribute('data-src') || '',
                                shop: shopElement?.textContent?.trim() || ''
                            };
                            
                            // Extraction du prix
                            if (priceElement) {
                                const priceText = priceElement.textContent || '';
                                // Etsy peut avoir différentes devises
                                const priceMatch = priceText.match(/([A-Z]{3})?\s*([€$£¥])([0-9,]+\.?[0-9]*)|([0-9,]+\.?[0-9]*)\s*([A-Z]{3})/);                                
                                if (priceMatch) {
                                    const price = priceMatch[3] || priceMatch[4];
                                    product.price = parseFloat(price.replace(/,/g, ''));
                                    
                                    // Détection de la devise
                                    const currencySymbol = priceMatch[2] || priceMatch[5];
                                    const currencyCode = priceMatch[1] || priceMatch[5];
                                    
                                    if (currencyCode) {
                                        product.currency = currencyCode;
                                    } else if (currencySymbol) {
                                        switch (currencySymbol) {
                                            case '$': product.currency = 'USD'; break;
                                            case '€': product.currency = 'EUR'; break;
                                            case '£': product.currency = 'GBP'; break;
                                            case '¥': product.currency = 'JPY'; break;
                                            default: product.currency = 'USD';
                                        }
                                    } else {
                                        product.currency = 'USD';
                                    }
                                }
                            }
                            
                            // Note de la boutique
                            if (ratingElement) {
                                const ratingText = ratingElement.textContent || ratingElement.getAttribute('aria-label') || '';
                                const ratingMatch = ratingText.match(/([0-9.]+)/);                                
                                if (ratingMatch) {
                                    product.shopRating = parseFloat(ratingMatch[1]);
                                }
                            }
                            
                            // Badges spéciaux Etsy
                            const badgeElement = element.querySelector('.badge, [data-test-id="badge"]');
                            if (badgeElement) {
                                const badgeText = badgeElement.textContent?.toLowerCase() || '';
                                if (badgeText.includes('bestseller')) {
                                    product.isBestseller = true;
                                }
                                if (badgeText.includes('free shipping')) {
                                    product.freeShipping = true;
                                }
                            }
                            
                            // Disponibilité (Etsy affiche généralement les articles disponibles)
                            product.availability = 'Available';
                            
                            // Nombre de favoris
                            const favoritesElement = element.querySelector('.favorite-count, [data-test-id="favorite-count"]');
                            if (favoritesElement) {
                                const favText = favoritesElement.textContent || '';
                                const favMatch = favText.match(/([0-9,]+)/);                                
                                if (favMatch) {
                                    product.favoriteCount = parseInt(favMatch[1].replace(/,/g, ''));
                                }
                            }
                            
                            // Livraison gratuite
                            const shippingElement = element.querySelector('.free-shipping, [data-test-id="free-shipping"]');
                            if (shippingElement) {
                                product.freeShipping = true;
                            }
                            
                            if (product.title && product.url) {
                                results.push(product);
                            }
                        }
                    } catch (error) {
                        console.error('Erreur extraction produit Etsy:', error);
                    }
                });
                
                return results;
            });
            
            products.push(...pageProducts);
            
            // Vérifier s'il y a une page suivante
            const nextButton = await page.$('[data-test-id="pagination-next"], .btn-group .btn:last-child:not(.disabled)');
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
                const titleElement = document.querySelector('[data-test-id="listing-page-title"], h1');
                result.title = titleElement?.textContent?.trim() || '';
                
                // Prix
                const priceElement = document.querySelector('[data-test-id="listing-page-price"], .currency-value');
                if (priceElement) {
                    const priceText = priceElement.textContent || '';
                    const priceMatch = priceText.match(/([A-Z]{3})?\s*([€$£¥])([0-9,]+\.?[0-9]*)|([0-9,]+\.?[0-9]*)\s*([A-Z]{3})/);                    
                    if (priceMatch) {
                        const price = priceMatch[3] || priceMatch[4];
                        result.price = parseFloat(price.replace(/,/g, ''));
                        
                        const currencySymbol = priceMatch[2] || priceMatch[5];
                        const currencyCode = priceMatch[1] || priceMatch[5];
                        
                        if (currencyCode) {
                            result.currency = currencyCode;
                        } else if (currencySymbol) {
                            switch (currencySymbol) {
                                case '$': result.currency = 'USD'; break;
                                case '€': result.currency = 'EUR'; break;
                                case '£': result.currency = 'GBP'; break;
                                case '¥': result.currency = 'JPY'; break;
                                default: result.currency = 'USD';
                            }
                        }
                    }
                }
                
                // URL actuelle
                result.url = window.location.href;
                
                // Image principale
                const imageElement = document.querySelector('[data-test-id="listing-page-image"], .listing-page-image img');
                result.image = imageElement?.src || '';
                
                // Informations sur la boutique
                const shopElement = document.querySelector('[data-test-id="shop-name"], .shop-name a');
                result.shop = shopElement?.textContent?.trim() || '';
                
                const shopRatingElement = document.querySelector('[data-test-id="shop-rating"], .shop-rating');
                if (shopRatingElement) {
                    const ratingText = shopRatingElement.textContent || '';
                    const ratingMatch = ratingText.match(/([0-9.]+)/);                    
                    if (ratingMatch) {
                        result.shopRating = parseFloat(ratingMatch[1]);
                    }
                }
                
                // Avis sur le produit
                const reviewsElement = document.querySelector('[data-test-id="review-count"], .review-count');
                if (reviewsElement) {
                    const reviewText = reviewsElement.textContent || '';
                    const reviewMatch = reviewText.match(/([0-9,]+)/);                    
                    if (reviewMatch) {
                        result.reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
                    }
                }
                
                // Note moyenne
                const avgRatingElement = document.querySelector('[data-test-id="rating-stars"], .rating-stars');
                if (avgRatingElement) {
                    const ratingText = avgRatingElement.getAttribute('aria-label') || avgRatingElement.textContent || '';
                    const ratingMatch = ratingText.match(/([0-9.]+)/);                    
                    if (ratingMatch) {
                        result.rating = parseFloat(ratingMatch[1]);
                    }
                }
                
                // Quantité disponible
                const quantityElement = document.querySelector('[data-test-id="quantity-input"], .quantity-input');
                if (quantityElement) {
                    const maxQty = quantityElement.getAttribute('max');
                    if (maxQty) {
                        result.quantity = parseInt(maxQty);
                        result.availability = result.quantity > 0 ? 'In Stock' : 'Out of Stock';
                    }
                } else {
                    result.availability = 'Available';
                }
                
                // Description
                const descElement = document.querySelector('[data-test-id="listing-page-description"], .listing-page-description');
                result.description = descElement?.textContent?.trim().substring(0, 500) || '';
                
                // Matériaux
                const materialsElement = document.querySelector('[data-test-id="listing-page-materials"], .materials');
                if (materialsElement) {
                    result.materials = materialsElement.textContent?.trim() || '';
                }
                
                // Délai de traitement
                const processingElement = document.querySelector('[data-test-id="processing-time"], .processing-time');
                if (processingElement) {
                    result.processingTime = processingElement.textContent?.trim() || '';
                }
                
                // Politique de retour
                const returnElement = document.querySelector('[data-test-id="return-policy"], .return-policy');
                if (returnElement) {
                    result.returnPolicy = returnElement.textContent?.trim() || '';
                }
                
                // Frais de livraison
                const shippingElement = document.querySelector('[data-test-id="shipping-cost"], .shipping-cost');
                if (shippingElement) {
                    const shippingText = shippingElement.textContent || '';
                    if (shippingText.toLowerCase().includes('free')) {
                        result.shipping = 'Free';
                    } else {
                        const shippingMatch = shippingText.match(/([€$£¥])([0-9,]+\.?[0-9]*)/);                        
                        if (shippingMatch) {
                            result.shipping = parseFloat(shippingMatch[2].replace(/,/g, ''));
                        }
                    }
                }
                
                // Tags/Catégories
                const tagsElements = document.querySelectorAll('[data-test-id="listing-tag"], .listing-tag');
                if (tagsElements.length > 0) {
                    result.tags = Array.from(tagsElements).map(tag => tag.textContent?.trim()).filter(Boolean);
                }
                
                // Personnalisation disponible
                const customizationElement = document.querySelector('[data-test-id="personalization"], .personalization');
                if (customizationElement) {
                    result.customizable = true;
                }
                
                return result;
            });
            
            return [product];
            
        } catch (error) {
            console.error('Erreur scraping page produit Etsy:', error);
            return [];
        }
    }
    
    static async handleAntiBot(page) {
        try {
            // Vérifier s'il y a une vérification de sécurité
            const securityElement = await page.$('.security-challenge, [data-test-id="security-challenge"]');
            if (securityElement) {
                console.log('⚠️ Vérification de sécurité détectée sur Etsy');
                await page.waitForTimeout(5000);
                return false;
            }
            
            // Vérifier les cookies/GDPR
            const cookieElement = await page.$('[data-test-id="cookie-banner"], .cookie-banner');
            if (cookieElement) {
                try {
                    const acceptButton = await page.$('[data-test-id="accept-cookies"], .accept-cookies');
                    if (acceptButton) {
                        await acceptButton.click();
                        await page.waitForTimeout(1000);
                    }
                } catch (error) {
                    console.log('Impossible d\'accepter les cookies automatiquement');
                }
            }
            
            return true;
        } catch (error) {
            console.error('Erreur vérification anti-bot Etsy:', error);
            return true;
        }
    }
}

module.exports = EtsyScraper;