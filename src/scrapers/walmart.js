const cheerio = require('cheerio');
const moment = require('moment');

class WalmartScraper {
    static async scrape(page, type, searchTerm, maxProducts) {
        const products = [];
        
        try {
            // Attendre le chargement du contenu
            await page.waitForSelector('[data-testid="item-stack"], .product-title', { timeout: 10000 });
            
            if (type === 'search') {
                return await this.scrapeSearchResults(page, maxProducts);
            } else if (type === 'product') {
                return await this.scrapeProductPage(page);
            }
            
        } catch (error) {
            console.error('Erreur Walmart scraper:', error.message);
            return [];
        }
        
        return products;
    }
    
    static async scrapeSearchResults(page, maxProducts) {
        const products = [];
        let currentPage = 1;
        
        while (products.length < maxProducts) {
            console.log(`📄 Walmart - Page ${currentPage}`);
            
            // Scroll pour charger plus de produits (Walmart utilise le lazy loading)
            await this.scrollToLoadMore(page);
            
            // Extraire les produits de la page actuelle
            const pageProducts = await page.evaluate(() => {
                const results = [];
                const productElements = document.querySelectorAll('[data-testid="item-stack"], .search-result-gridview-item');
                
                productElements.forEach(element => {
                    try {
                        const titleElement = element.querySelector('[data-automation-id="product-title"], .product-title a');
                        const priceElement = element.querySelector('[itemprop="price"], .price-current');
                        const linkElement = element.querySelector('a[href*="/ip/"]');
                        const imageElement = element.querySelector('img');
                        const ratingElement = element.querySelector('.average-rating, [data-testid="reviews-section"]');
                        const reviewsElement = element.querySelector('.review-count, [data-testid="reviews-count"]');
                        
                        if (titleElement && linkElement) {
                            const product = {
                                title: titleElement.textContent?.trim() || titleElement.getAttribute('aria-label') || '',
                                url: linkElement.href ? new URL(linkElement.href, window.location.origin).href : '',
                                image: imageElement?.src || imageElement?.getAttribute('data-src') || ''
                            };
                            
                            // Extraction du prix
                            if (priceElement) {
                                const priceText = priceElement.textContent || '';
                                const priceMatch = priceText.match(/\$([0-9,]+\.?[0-9]*)/);                                
                                if (priceMatch) {
                                    product.price = parseFloat(priceMatch[1].replace(/,/g, ''));
                                    product.currency = 'USD';
                                }
                                
                                // Vérifier les prix barrés (promotions)
                                const originalPriceElement = element.querySelector('.price-old, [data-automation-id="product-price-old"]');
                                if (originalPriceElement) {
                                    const originalPriceText = originalPriceElement.textContent || '';
                                    const originalPriceMatch = originalPriceText.match(/\$([0-9,]+\.?[0-9]*)/);                                    
                                    if (originalPriceMatch) {
                                        product.originalPrice = parseFloat(originalPriceMatch[1].replace(/,/g, ''));
                                        product.discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
                                    }
                                }
                            }
                            
                            // Note et avis
                            if (ratingElement) {
                                const ratingText = ratingElement.textContent || ratingElement.getAttribute('aria-label') || '';
                                const ratingMatch = ratingText.match(/([0-9.]+)/);                                
                                if (ratingMatch) {
                                    product.rating = parseFloat(ratingMatch[1]);
                                }
                            }
                            
                            if (reviewsElement) {
                                const reviewText = reviewsElement.textContent || '';
                                const reviewMatch = reviewText.match(/([0-9,]+)/);                                
                                if (reviewMatch) {
                                    product.reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
                                }
                            }
                            
                            // Disponibilité
                            const stockElement = element.querySelector('[data-automation-id="fulfillment-badge"], .out-of-stock');
                            if (stockElement) {
                                const stockText = stockElement.textContent?.toLowerCase() || '';
                                if (stockText.includes('out of stock') || stockText.includes('unavailable')) {
                                    product.availability = 'Out of Stock';
                                } else if (stockText.includes('in stock') || stockText.includes('available')) {
                                    product.availability = 'In Stock';
                                } else {
                                    product.availability = 'Unknown';
                                }
                            } else {
                                product.availability = 'In Stock'; // Par défaut si affiché
                            }
                            
                            // Options de livraison
                            const shippingElement = element.querySelector('[data-automation-id="fulfillment-badge"], .shipping-info');
                            if (shippingElement) {
                                const shippingText = shippingElement.textContent?.toLowerCase() || '';
                                if (shippingText.includes('free')) {
                                    product.shipping = 'Free';
                                } else if (shippingText.includes('pickup')) {
                                    product.pickup = true;
                                }
                            }
                            
                            // Vendeur (Walmart vs Marketplace)
                            const sellerElement = element.querySelector('[data-automation-id="seller-name"], .seller-name');
                            if (sellerElement) {
                                product.seller = sellerElement.textContent?.trim() || '';
                            } else {
                                product.seller = 'Walmart'; // Par défaut
                            }
                            
                            if (product.title && product.url) {
                                results.push(product);
                            }
                        }
                    } catch (error) {
                        console.error('Erreur extraction produit Walmart:', error);
                    }
                });
                
                return results;
            });
            
            products.push(...pageProducts);
            
            // Vérifier s'il y a une page suivante
            const nextButton = await page.$('[data-testid="pagination-next"], .paginator-btn.paginator-btn-next:not(.disabled)');
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
                const titleElement = document.querySelector('[data-automation-id="product-title"], .product-title');
                result.title = titleElement?.textContent?.trim() || '';
                
                // Prix
                const priceElement = document.querySelector('[itemprop="price"], [data-testid="price-current"]');
                if (priceElement) {
                    const priceText = priceElement.textContent || '';
                    const priceMatch = priceText.match(/\$([0-9,]+\.?[0-9]*)/);                    
                    if (priceMatch) {
                        result.price = parseFloat(priceMatch[1].replace(/,/g, ''));
                        result.currency = 'USD';
                    }
                }
                
                // Prix original (si en promotion)
                const originalPriceElement = document.querySelector('[data-testid="price-old"], .price-old');
                if (originalPriceElement) {
                    const originalPriceText = originalPriceElement.textContent || '';
                    const originalPriceMatch = originalPriceText.match(/\$([0-9,]+\.?[0-9]*)/);                    
                    if (originalPriceMatch) {
                        result.originalPrice = parseFloat(originalPriceMatch[1].replace(/,/g, ''));
                        result.discount = Math.round(((result.originalPrice - result.price) / result.originalPrice) * 100);
                    }
                }
                
                // URL actuelle
                result.url = window.location.href;
                
                // Image principale
                const imageElement = document.querySelector('[data-testid="hero-image"], .prod-hero-image img');
                result.image = imageElement?.src || '';
                
                // Note et avis
                const ratingElement = document.querySelector('[data-testid="reviews-section"] .average-rating');
                if (ratingElement) {
                    const ratingText = ratingElement.textContent || '';
                    const ratingMatch = ratingText.match(/([0-9.]+)/);                    
                    if (ratingMatch) {
                        result.rating = parseFloat(ratingMatch[1]);
                    }
                }
                
                const reviewsElement = document.querySelector('[data-testid="reviews-section"] .review-count');
                if (reviewsElement) {
                    const reviewText = reviewsElement.textContent || '';
                    const reviewMatch = reviewText.match(/([0-9,]+)/);                    
                    if (reviewMatch) {
                        result.reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
                    }
                }
                
                // Disponibilité
                const stockElement = document.querySelector('[data-testid="fulfillment-section"], .product-fulfillment');
                if (stockElement) {
                    const stockText = stockElement.textContent?.toLowerCase() || '';
                    if (stockText.includes('out of stock') || stockText.includes('unavailable')) {
                        result.availability = 'Out of Stock';
                    } else if (stockText.includes('in stock') || stockText.includes('available')) {
                        result.availability = 'In Stock';
                    } else {
                        result.availability = 'Unknown';
                    }
                } else {
                    result.availability = 'In Stock';
                }
                
                // Options de livraison
                const shippingElement = document.querySelector('[data-testid="fulfillment-section"]');
                if (shippingElement) {
                    const shippingText = shippingElement.textContent?.toLowerCase() || '';
                    if (shippingText.includes('free shipping')) {
                        result.shipping = 'Free';
                    }
                    if (shippingText.includes('pickup')) {
                        result.pickup = true;
                    }
                }
                
                // Vendeur
                const sellerElement = document.querySelector('[data-automation-id="seller-name"], .seller-info');
                result.seller = sellerElement?.textContent?.trim() || 'Walmart';
                
                // Description
                const descElement = document.querySelector('[data-testid="product-description"], .product-description');
                result.description = descElement?.textContent?.trim().substring(0, 500) || '';
                
                // Spécifications
                const specsElement = document.querySelector('[data-testid="product-specifications"], .product-specs');
                if (specsElement) {
                    result.specifications = specsElement.textContent?.trim().substring(0, 300) || '';
                }
                
                // Marque
                const brandElement = document.querySelector('[data-automation-id="product-brand"], .brand-name');
                result.brand = brandElement?.textContent?.trim() || '';
                
                return result;
            });
            
            return [product];
            
        } catch (error) {
            console.error('Erreur scraping page produit Walmart:', error);
            return [];
        }
    }
    
    static async scrollToLoadMore(page) {
        try {
            // Scroll progressif pour déclencher le lazy loading
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        
                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
            
            // Attendre que le contenu se charge
            await page.waitForTimeout(2000);
            
        } catch (error) {
            console.error('Erreur lors du scroll Walmart:', error);
        }
    }
    
    static async handleAntiBot(page) {
        try {
            // Vérifier s'il y a une vérification de sécurité
            const securityElement = await page.$('.security-check, [data-testid="security-check"]');
            if (securityElement) {
                console.log('⚠️ Vérification de sécurité détectée sur Walmart');
                await page.waitForTimeout(5000);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Erreur vérification anti-bot Walmart:', error);
            return true;
        }
    }
}

module.exports = WalmartScraper;