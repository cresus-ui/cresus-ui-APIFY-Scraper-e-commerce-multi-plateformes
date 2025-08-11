const cheerio = require('cheerio');
const moment = require('moment');

class AmazonScraper {
    static async scrape(page, type, searchTerm, maxProducts) {
        const products = [];
        
        try {
            // Attendre le chargement du contenu
            await page.waitForSelector('[data-component-type="s-search-result"], #productTitle', { timeout: 10000 });
            
            if (type === 'search') {
                return await this.scrapeSearchResults(page, maxProducts);
            } else if (type === 'product') {
                return await this.scrapeProductPage(page);
            }
            
        } catch (error) {
            console.error('Erreur Amazon scraper:', error.message);
            return [];
        }
        
        return products;
    }
    
    static async scrapeSearchResults(page, maxProducts) {
        const products = [];
        let currentPage = 1;
        
        while (products.length < maxProducts) {
            console.log(`📄 Amazon - Page ${currentPage}`);
            
            // Extraire les produits de la page actuelle
            const pageProducts = await page.evaluate(() => {
                const results = [];
                const productElements = document.querySelectorAll('[data-component-type="s-search-result"]');
                
                productElements.forEach(element => {
                    try {
                        const titleElement = element.querySelector('h2 a span, h2 a');
                        const priceElement = element.querySelector('.a-price-whole, .a-price .a-offscreen');
                        const linkElement = element.querySelector('h2 a');
                        const imageElement = element.querySelector('img');
                        const ratingElement = element.querySelector('.a-icon-alt');
                        const reviewsElement = element.querySelector('.a-size-base');
                        
                        if (titleElement && linkElement) {
                            const product = {
                                title: titleElement.textContent?.trim() || '',
                                url: linkElement.href ? new URL(linkElement.href, window.location.origin).href : '',
                                image: imageElement?.src || '',
                                rating: ratingElement?.textContent?.match(/([0-9.]+)/)?.[1] || null,
                                reviewCount: reviewsElement?.textContent?.match(/([0-9,]+)/)?.[1]?.replace(/,/g, '') || null
                            };
                            
                            // Extraction du prix
                            if (priceElement) {
                                const priceText = priceElement.textContent || '';
                                const priceMatch = priceText.match(/([0-9,]+\.?[0-9]*)/);                                
                                if (priceMatch) {
                                    product.price = parseFloat(priceMatch[1].replace(/,/g, ''));
                                    product.currency = priceText.includes('$') ? 'USD' : 'USD'; // Default USD
                                }
                            }
                            
                            // Vérification de la disponibilité
                            const availabilityElement = element.querySelector('.a-color-success, .a-color-price');
                            product.availability = availabilityElement ? 'In Stock' : 'Unknown';
                            
                            if (product.title && product.url) {
                                results.push(product);
                            }
                        }
                    } catch (error) {
                        console.error('Erreur extraction produit Amazon:', error);
                    }
                });
                
                return results;
            });
            
            products.push(...pageProducts);
            
            // Vérifier s'il y a une page suivante
            const nextButton = await page.$('.s-pagination-next:not(.s-pagination-disabled)');
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
                const titleElement = document.querySelector('#productTitle');
                result.title = titleElement?.textContent?.trim() || '';
                
                // Prix
                const priceElement = document.querySelector('.a-price .a-offscreen, #price_inside_buybox');
                if (priceElement) {
                    const priceText = priceElement.textContent || '';
                    const priceMatch = priceText.match(/([0-9,]+\.?[0-9]*)/);                    
                    if (priceMatch) {
                        result.price = parseFloat(priceMatch[1].replace(/,/g, ''));
                        result.currency = priceText.includes('$') ? 'USD' : 'USD';
                    }
                }
                
                // URL actuelle
                result.url = window.location.href;
                
                // Image principale
                const imageElement = document.querySelector('#landingImage, #imgBlkFront');
                result.image = imageElement?.src || '';
                
                // Note et avis
                const ratingElement = document.querySelector('.a-icon-alt');
                result.rating = ratingElement?.textContent?.match(/([0-9.]+)/)?.[1] || null;
                
                const reviewsElement = document.querySelector('#acrCustomerReviewText');
                result.reviewCount = reviewsElement?.textContent?.match(/([0-9,]+)/)?.[1]?.replace(/,/g, '') || null;
                
                // Disponibilité
                const availabilityElement = document.querySelector('#availability span, #outOfStock');
                if (availabilityElement) {
                    const availText = availabilityElement.textContent?.toLowerCase() || '';
                    if (availText.includes('in stock') || availText.includes('available')) {
                        result.availability = 'In Stock';
                    } else if (availText.includes('out of stock') || availText.includes('unavailable')) {
                        result.availability = 'Out of Stock';
                    } else {
                        result.availability = 'Unknown';
                    }
                } else {
                    result.availability = 'Unknown';
                }
                
                // Description
                const descElement = document.querySelector('#feature-bullets ul, #productDescription');
                result.description = descElement?.textContent?.trim().substring(0, 500) || '';
                
                // Vendeur
                const sellerElement = document.querySelector('#sellerProfileTriggerId, #bylineInfo');
                result.seller = sellerElement?.textContent?.trim() || '';
                
                // Catégorie
                const breadcrumbElement = document.querySelector('#wayfinding-breadcrumbs_feature_div');
                result.category = breadcrumbElement?.textContent?.trim() || '';
                
                return result;
            });
            
            return [product];
            
        } catch (error) {
            console.error('Erreur scraping page produit Amazon:', error);
            return [];
        }
    }
    
    static async handleAntiBot(page) {
        try {
            // Vérifier s'il y a un CAPTCHA
            const captchaElement = await page.$('form[action*="captcha"]');
            if (captchaElement) {
                console.log('⚠️ CAPTCHA détecté sur Amazon');
                await page.waitForTimeout(5000);
                return false;
            }
            
            // Vérifier les autres mesures anti-bot
            const robotCheckElement = await page.$('body:contains("Robot Check")');
            if (robotCheckElement) {
                console.log('⚠️ Vérification robot détectée sur Amazon');
                await page.waitForTimeout(10000);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Erreur vérification anti-bot Amazon:', error);
            return true;
        }
    }
}

module.exports = AmazonScraper;