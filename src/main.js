const Apify = require('apify');
const { playwright } = require('playwright');
const cheerio = require('cheerio');
const axios = require('axios');
const moment = require('moment');
const _ = require('lodash');
const UserAgent = require('user-agents');

// Import platform scrapers
const AmazonScraper = require('./scrapers/amazon');
const EbayScraper = require('./scrapers/ebay');
const WalmartScraper = require('./scrapers/walmart');
const EtsyScraper = require('./scrapers/etsy');
const ShopifyScraper = require('./scrapers/shopify');

Apify.main(async () => {
    console.log('🚀 Démarrage du scraper e-commerce multi-plateformes');
    
    // Récupération des inputs
    const input = await Apify.getInput();
    const {
        platforms = ['amazon', 'ebay', 'walmart', 'etsy', 'shopify'],
        searchTerms = [],
        productUrls = [],
        maxProducts = 100,
        trackPrices = true,
        trackStock = true,
        trackTrends = false,
        proxyConfiguration,
        maxConcurrency = 5,
        requestDelay = 1000
    } = input;

    // Validation des inputs
    if (!searchTerms.length && !productUrls.length) {
        throw new Error('Veuillez fournir au moins un terme de recherche ou une URL de produit');
    }

    // Configuration du proxy
    const proxyConfig = await Apify.createProxyConfiguration(proxyConfiguration);
    
    // Initialisation du dataset
    const dataset = await Apify.openDataset();
    
    // Configuration du crawler
    const requestQueue = await Apify.openRequestQueue();
    
    // Ajout des requêtes pour chaque plateforme
    for (const platform of platforms) {
        if (searchTerms.length > 0) {
            for (const term of searchTerms) {
                await requestQueue.addRequest({
                    url: getSearchUrl(platform, term),
                    userData: {
                        platform,
                        searchTerm: term,
                        type: 'search'
                    }
                });
            }
        }
        
        if (productUrls.length > 0) {
            for (const url of productUrls) {
                if (url.includes(getPlatformDomain(platform))) {
                    await requestQueue.addRequest({
                        url,
                        userData: {
                            platform,
                            type: 'product'
                        }
                    });
                }
            }
        }
    }

    // Configuration du crawler Playwright
    const crawler = new Apify.PlaywrightCrawler({
        requestQueue,
        proxyConfiguration: proxyConfig,
        maxConcurrency,
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 30,
        
        async requestHandler({ request, page, response }) {
            const { platform, type, searchTerm } = request.userData;
            
            console.log(`📊 Scraping ${platform} - ${type} - ${request.url}`);
            
            // Attendre le chargement de la page
            await page.waitForTimeout(requestDelay);
            
            let results = [];
            
            try {
                // Sélection du scraper approprié
                switch (platform) {
                    case 'amazon':
                        results = await AmazonScraper.scrape(page, type, searchTerm, maxProducts);
                        break;
                    case 'ebay':
                        results = await EbayScraper.scrape(page, type, searchTerm, maxProducts);
                        break;
                    case 'walmart':
                        results = await WalmartScraper.scrape(page, type, searchTerm, maxProducts);
                        break;
                    case 'etsy':
                        results = await EtsyScraper.scrape(page, type, searchTerm, maxProducts);
                        break;
                    case 'shopify':
                        results = await ShopifyScraper.scrape(page, type, searchTerm, maxProducts);
                        break;
                    default:
                        console.log(`⚠️ Plateforme non supportée: ${platform}`);
                        return;
                }
                
                // Enrichissement des données
                const enrichedResults = results.map(product => ({
                    ...product,
                    platform,
                    searchTerm: searchTerm || null,
                    scrapedAt: moment().toISOString(),
                    trackingEnabled: {
                        prices: trackPrices,
                        stock: trackStock,
                        trends: trackTrends
                    }
                }));
                
                // Sauvegarde dans le dataset
                await dataset.pushData(enrichedResults);
                
                console.log(`✅ ${enrichedResults.length} produits scrapés depuis ${platform}`);
                
            } catch (error) {
                console.error(`❌ Erreur lors du scraping de ${platform}:`, error.message);
                
                // Log de l'erreur pour debugging
                await Apify.setValue(`error-${platform}-${Date.now()}`, {
                    platform,
                    url: request.url,
                    error: error.message,
                    stack: error.stack,
                    timestamp: moment().toISOString()
                });
            }
        },
        
        async failedRequestHandler({ request, error }) {
            console.error(`❌ Requête échouée: ${request.url}`, error.message);
            
            await Apify.setValue(`failed-request-${Date.now()}`, {
                url: request.url,
                userData: request.userData,
                error: error.message,
                timestamp: moment().toISOString()
            });
        },
        
        launchContext: {
            useChrome: true,
            launchOptions: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        }
    });
    
    // Démarrage du crawler
    await crawler.run();
    
    // Statistiques finales
    const finalStats = await dataset.getInfo();
    console.log(`🎉 Scraping terminé! ${finalStats.itemCount} produits collectés au total.`);
    
    // Sauvegarde des statistiques
    await Apify.setValue('scraping-stats', {
        totalProducts: finalStats.itemCount,
        platforms: platforms,
        searchTerms: searchTerms,
        completedAt: moment().toISOString(),
        trackingSettings: {
            prices: trackPrices,
            stock: trackStock,
            trends: trackTrends
        }
    });
});

// Fonctions utilitaires
function getSearchUrl(platform, searchTerm) {
    const encodedTerm = encodeURIComponent(searchTerm);
    
    switch (platform) {
        case 'amazon':
            return `https://www.amazon.com/s?k=${encodedTerm}`;
        case 'ebay':
            return `https://www.ebay.com/sch/i.html?_nkw=${encodedTerm}`;
        case 'walmart':
            return `https://www.walmart.com/search?q=${encodedTerm}`;
        case 'etsy':
            return `https://www.etsy.com/search?q=${encodedTerm}`;
        case 'shopify':
            // Note: Shopify nécessite un domaine spécifique
            return `https://shopify.com/search?q=${encodedTerm}`;
        default:
            throw new Error(`Plateforme non supportée: ${platform}`);
    }
}

function getPlatformDomain(platform) {
    switch (platform) {
        case 'amazon':
            return 'amazon.com';
        case 'ebay':
            return 'ebay.com';
        case 'walmart':
            return 'walmart.com';
        case 'etsy':
            return 'etsy.com';
        case 'shopify':
            return 'shopify.com';
        default:
            return '';
    }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});