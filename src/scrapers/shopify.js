const cheerio = require('cheerio');
const moment = require('moment');
const axios = require('axios');

class ShopifyScraper {
    static async scrape(page, type, searchTerm, maxProducts) {
        const products = [];
        
        try {
            // Détecter si c'est un store Shopify
            const isShopify = await this.detectShopifyStore(page);
            if (!isShopify) {
                console.log('⚠️ Ce site ne semble pas être un store Shopify');
                return [];
            }
            
            // Attendre le chargement du contenu
            await page.waitForSelector('.product-item, .product-card, [data-product-id]', { timeout: 10000 });
            
            if (type === 'search') {
                return await this.scrapeSearchResults(page, maxProducts, searchTerm);
            } else if (type === 'product') {
                return await this.scrapeProductPage(page);
            }
            
        } catch (error) {
            console.error('Erreur Shopify scraper:', error.message);
            // Essayer l'API Shopify en fallback
            return await this.tryShopifyAPI(page, searchTerm, maxProducts);
        }
        
        return products;
    }
    
    static async detectShopifyStore(page) {
        try {
            const isShopify = await page.evaluate(() => {
                // Vérifier les indicateurs Shopify
                return !!(
                    window.Shopify ||
                    document.querySelector('script[src*="shopify"]') ||
                    document.querySelector('link[href*="shopify"]') ||
                    document.querySelector('meta[name="shopify-checkout-api-token"]') ||
                    document.querySelector('[data-shopify]') ||
                    window.ShopifyAnalytics
                );
            });
            
            return isShopify;
        } catch (error) {
            return false;
        }
    }
    
    static async scrapeSearchResults(page, maxProducts, searchTerm) {
        const products = [];
        
        try {
            // Essayer d'utiliser la recherche Shopify
            if (searchTerm) {
                const searchUrl = await this.buildSearchUrl(page, searchTerm);
                if (searchUrl) {
                    await page.goto(searchUrl, { waitUntil: 'networkidle0' });
                }
            }
            
            // Extraire les produits
            const pageProducts = await page.evaluate(() => {
                const results = [];
                
                // Sélecteurs communs pour les stores Shopify
                const selectors = [
                    '.product-item',
                    '.product-card',
                    '.grid-product',
                    '.product-grid-item',
                    '[data-product-id]',
                    '.product',
                    '.collection-product-card'
                ];
                
                let productElements = [];
                for (const selector of selectors) {
                    productElements = document.querySelectorAll(selector);
                    if (productElements.length > 0) break;
                }
                
                productElements.forEach(element => {
                    try {
                        const product = {};
                        
                        // Titre - essayer plusieurs sélecteurs
                        const titleSelectors = [
                            '.product-title',
                            '.product-name',
                            '.product-item-title',
                            'h3 a',
                            'h2 a',
                            '.card-title',
                            '[data-product-title]'
                        ];
                        
                        for (const selector of titleSelectors) {
                            const titleElement = element.querySelector(selector);
                            if (titleElement) {
                                product.title = titleElement.textContent?.trim() || titleElement.getAttribute('title') || '';
                                break;
                            }
                        }
                        
                        // URL - essayer plusieurs sélecteurs
                        const linkSelectors = [
                            'a[href*="/products/"]',
                            '.product-link',
                            '.product-item-link',
                            'a'
                        ];
                        
                        for (const selector of linkSelectors) {
                            const linkElement = element.querySelector(selector);
                            if (linkElement && linkElement.href) {
                                product.url = new URL(linkElement.href, window.location.origin).href;
                                break;
                            }
                        }
                        
                        // Prix - essayer plusieurs sélecteurs
                        const priceSelectors = [
                            '.price',
                            '.product-price',
                            '.money',
                            '.price-current',
                            '[data-price]',
                            '.product-item-price'
                        ];
                        
                        for (const selector of priceSelectors) {
                            const priceElement = element.querySelector(selector);
                            if (priceElement) {
                                const priceText = priceElement.textContent || priceElement.getAttribute('data-price') || '';
                                const priceMatch = priceText.match(/([€$£¥])([0-9,]+\.?[0-9]*)|([0-9,]+\.?[0-9]*)\s*([€$£¥])/);                                
                                if (priceMatch) {
                                    const price = priceMatch[2] || priceMatch[3];
                                    product.price = parseFloat(price.replace(/,/g, ''));
                                    
                                    const currency = priceMatch[1] || priceMatch[4];
                                    switch (currency) {
                                        case '$': product.currency = 'USD'; break;
                                        case '€': product.currency = 'EUR'; break;
                                        case '£': product.currency = 'GBP'; break;
                                        case '¥': product.currency = 'JPY'; break;
                                        default: product.currency = 'USD';
                                    }
                                }
                                break;
                            }
                        }
                        
                        // Prix comparé (prix barré)
                        const comparePriceSelectors = [
                            '.compare-price',
                            '.price-compare',
                            '.was-price',
                            '.original-price'
                        ];
                        
                        for (const selector of comparePriceSelectors) {
                            const comparePriceElement = element.querySelector(selector);
                            if (comparePriceElement) {
                                const comparePriceText = comparePriceElement.textContent || '';
                                const comparePriceMatch = comparePriceText.match(/([€$£¥])([0-9,]+\.?[0-9]*)|([0-9,]+\.?[0-9]*)\s*([€$£¥])/);                                
                                if (comparePriceMatch) {
                                    const comparePrice = comparePriceMatch[2] || comparePriceMatch[3];
                                    product.comparePrice = parseFloat(comparePrice.replace(/,/g, ''));
                                    
                                    if (product.price && product.comparePrice) {
                                        product.discount = Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
                                    }
                                }
                                break;
                            }
                        }
                        
                        // Image
                        const imageSelectors = [
                            '.product-image img',
                            '.product-item-image img',
                            'img[data-src]',
                            'img'
                        ];
                        
                        for (const selector of imageSelectors) {
                            const imageElement = element.querySelector(selector);
                            if (imageElement) {
                                product.image = imageElement.src || imageElement.getAttribute('data-src') || '';
                                break;
                            }
                        }
                        
                        // Disponibilité
                        const stockSelectors = [
                            '.sold-out',
                            '.out-of-stock',
                            '.unavailable',
                            '[data-available="false"]'
                        ];
                        
                        let isOutOfStock = false;
                        for (const selector of stockSelectors) {
                            if (element.querySelector(selector)) {
                                isOutOfStock = true;
                                break;
                            }
                        }
                        
                        product.availability = isOutOfStock ? 'Out of Stock' : 'In Stock';
                        
                        // Badges/Labels
                        const badgeSelectors = [
                            '.badge',
                            '.label',
                            '.product-badge',
                            '.sale-badge'
                        ];
                        
                        for (const selector of badgeSelectors) {
                            const badgeElement = element.querySelector(selector);
                            if (badgeElement) {
                                const badgeText = badgeElement.textContent?.toLowerCase() || '';
                                if (badgeText.includes('sale') || badgeText.includes('promo')) {
                                    product.onSale = true;
                                }
                                if (badgeText.includes('new')) {
                                    product.isNew = true;
                                }
                                break;
                            }
                        }
                        
                        // Variantes (couleurs, tailles)
                        const variantElements = element.querySelectorAll('.variant-option, .color-swatch, .size-option');
                        if (variantElements.length > 0) {
                            product.hasVariants = true;
                            product.variantCount = variantElements.length;
                        }
                        
                        if (product.title && product.url) {
                            results.push(product);
                        }
                        
                    } catch (error) {
                        console.error('Erreur extraction produit Shopify:', error);
                    }
                });
                
                return results;
            });
            
            products.push(...pageProducts);
            
        } catch (error) {
            console.error('Erreur scraping search Shopify:', error);
        }
        
        return products.slice(0, maxProducts);
    }
    
    static async scrapeProductPage(page) {
        try {
            const product = await page.evaluate(() => {
                const result = {};
                
                // Titre du produit
                const titleSelectors = [
                    '.product-title',
                    '.product-name',
                    'h1.product-single__title',
                    'h1',
                    '[data-product-title]'
                ];
                
                for (const selector of titleSelectors) {
                    const titleElement = document.querySelector(selector);
                    if (titleElement) {
                        result.title = titleElement.textContent?.trim() || '';
                        break;
                    }
                }
                
                // Prix
                const priceSelectors = [
                    '.price',
                    '.product-price',
                    '.money',
                    '.price-current',
                    '[data-price]'
                ];
                
                for (const selector of priceSelectors) {
                    const priceElement = document.querySelector(selector);
                    if (priceElement) {
                        const priceText = priceElement.textContent || priceElement.getAttribute('data-price') || '';
                        const priceMatch = priceText.match(/([€$£¥])([0-9,]+\.?[0-9]*)|([0-9,]+\.?[0-9]*)\s*([€$£¥])/);                        
                        if (priceMatch) {
                            const price = priceMatch[2] || priceMatch[3];
                            result.price = parseFloat(price.replace(/,/g, ''));
                            
                            const currency = priceMatch[1] || priceMatch[4];
                            switch (currency) {
                                case '$': result.currency = 'USD'; break;
                                case '€': result.currency = 'EUR'; break;
                                case '£': result.currency = 'GBP'; break;
                                case '¥': result.currency = 'JPY'; break;
                                default: result.currency = 'USD';
                            }
                        }
                        break;
                    }
                }
                
                // URL actuelle
                result.url = window.location.href;
                
                // Image principale
                const imageSelectors = [
                    '.product-single__photo img',
                    '.product-image img',
                    '.featured-image img',
                    'img[data-zoom]'
                ];
                
                for (const selector of imageSelectors) {
                    const imageElement = document.querySelector(selector);
                    if (imageElement) {
                        result.image = imageElement.src || imageElement.getAttribute('data-src') || '';
                        break;
                    }
                }
                
                // Description
                const descSelectors = [
                    '.product-description',
                    '.product-single__description',
                    '.rte',
                    '.product-content'
                ];
                
                for (const selector of descSelectors) {
                    const descElement = document.querySelector(selector);
                    if (descElement) {
                        result.description = descElement.textContent?.trim().substring(0, 500) || '';
                        break;
                    }
                }
                
                // Disponibilité
                const stockSelectors = [
                    '.sold-out',
                    '.out-of-stock',
                    '.unavailable'
                ];
                
                let isOutOfStock = false;
                for (const selector of stockSelectors) {
                    if (document.querySelector(selector)) {
                        isOutOfStock = true;
                        break;
                    }
                }
                
                result.availability = isOutOfStock ? 'Out of Stock' : 'In Stock';
                
                // Variantes
                const variantSelectors = document.querySelectorAll('.product-form__option, .variant-input, .single-option-selector');
                if (variantSelectors.length > 0) {
                    result.hasVariants = true;
                    result.variants = [];
                    
                    variantSelectors.forEach(variant => {
                        const label = variant.querySelector('label, .option-name');
                        const options = variant.querySelectorAll('option, .variant-option');
                        
                        if (label && options.length > 0) {
                            const variantData = {
                                name: label.textContent?.trim() || '',
                                options: Array.from(options).map(opt => opt.textContent?.trim() || opt.value).filter(Boolean)
                            };
                            result.variants.push(variantData);
                        }
                    });
                }
                
                // Vendor/Marque
                const vendorSelectors = [
                    '.product-vendor',
                    '.product-brand',
                    '[data-vendor]'
                ];
                
                for (const selector of vendorSelectors) {
                    const vendorElement = document.querySelector(selector);
                    if (vendorElement) {
                        result.vendor = vendorElement.textContent?.trim() || vendorElement.getAttribute('data-vendor') || '';
                        break;
                    }
                }
                
                // SKU
                const skuSelectors = [
                    '.product-sku',
                    '[data-sku]',
                    '.variant-sku'
                ];
                
                for (const selector of skuSelectors) {
                    const skuElement = document.querySelector(selector);
                    if (skuElement) {
                        result.sku = skuElement.textContent?.trim() || skuElement.getAttribute('data-sku') || '';
                        break;
                    }
                }
                
                // Tags
                const tagElements = document.querySelectorAll('.product-tag, .tag');
                if (tagElements.length > 0) {
                    result.tags = Array.from(tagElements).map(tag => tag.textContent?.trim()).filter(Boolean);
                }
                
                return result;
            });
            
            return [product];
            
        } catch (error) {
            console.error('Erreur scraping page produit Shopify:', error);
            return [];
        }
    }
    
    static async buildSearchUrl(page, searchTerm) {
        try {
            const currentUrl = page.url();
            const baseUrl = new URL(currentUrl).origin;
            
            // URLs de recherche communes pour Shopify
            const searchPaths = [
                `/search?q=${encodeURIComponent(searchTerm)}`,
                `/collections/all?q=${encodeURIComponent(searchTerm)}`,
                `/pages/search-results?q=${encodeURIComponent(searchTerm)}`
            ];
            
            return baseUrl + searchPaths[0];
        } catch (error) {
            return null;
        }
    }
    
    static async tryShopifyAPI(page, searchTerm, maxProducts) {
        try {
            const currentUrl = page.url();
            const baseUrl = new URL(currentUrl).origin;
            
            // Essayer l'API Shopify
            const apiUrl = `${baseUrl}/products.json?limit=${Math.min(maxProducts, 250)}`;
            
            const response = await axios.get(apiUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.data && response.data.products) {
                const products = response.data.products.map(product => ({
                    title: product.title || '',
                    url: `${baseUrl}/products/${product.handle}`,
                    image: product.images && product.images[0] ? product.images[0].src : '',
                    description: product.body_html ? product.body_html.replace(/<[^>]*>/g, '').substring(0, 500) : '',
                    vendor: product.vendor || '',
                    productType: product.product_type || '',
                    tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
                    variants: product.variants ? product.variants.map(variant => ({
                        price: parseFloat(variant.price),
                        comparePrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
                        available: variant.available,
                        sku: variant.sku || '',
                        title: variant.title || ''
                    })) : [],
                    availability: product.variants && product.variants.some(v => v.available) ? 'In Stock' : 'Out of Stock'
                }));
                
                // Filtrer par terme de recherche si fourni
                if (searchTerm) {
                    const filtered = products.filter(product => 
                        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
                    );
                    return filtered.slice(0, maxProducts);
                }
                
                return products.slice(0, maxProducts);
            }
            
        } catch (error) {
            console.error('Erreur API Shopify:', error.message);
        }
        
        return [];
    }
    
    static async handleAntiBot(page) {
        try {
            // Shopify a généralement moins de mesures anti-bot agressives
            // Vérifier les cookies/GDPR
            const cookieElement = await page.$('.cookie-banner, .gdpr-banner');
            if (cookieElement) {
                try {
                    const acceptButton = await page.$('.accept-cookies, .accept-all');
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
            console.error('Erreur vérification anti-bot Shopify:', error);
            return true;
        }
    }
}

module.exports = ShopifyScraper;