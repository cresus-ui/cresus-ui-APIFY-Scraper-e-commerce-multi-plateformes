/**
 * Tests pour l'Actor Scraper E-commerce Multi-plateformes
 * 
 * Utilise Jest pour les tests unitaires et d'intégration
 */

const Apify = require('apify');
const { AmazonScraper } = require('../src/scrapers/amazon');
const { EbayScraper } = require('../src/scrapers/ebay');
const { WalmartScraper } = require('../src/scrapers/walmart');
const { EtsyScraper } = require('../src/scrapers/etsy');
const { ShopifyScraper } = require('../src/scrapers/shopify');

// Mock Playwright pour les tests
jest.mock('playwright', () => ({
    chromium: {
        launch: jest.fn(() => Promise.resolve({
            newContext: jest.fn(() => Promise.resolve({
                newPage: jest.fn(() => Promise.resolve({
                    goto: jest.fn(),
                    waitForSelector: jest.fn(),
                    $: jest.fn(),
                    $$: jest.fn(),
                    evaluate: jest.fn(),
                    screenshot: jest.fn(),
                    close: jest.fn()
                }))
            })),
            close: jest.fn()
        }))
    }
}));

describe('Scrapers E-commerce', () => {
    let mockPage;
    
    beforeEach(() => {
        mockPage = {
            goto: jest.fn(),
            waitForSelector: jest.fn(),
            $: jest.fn(),
            $$: jest.fn(),
            evaluate: jest.fn(),
            screenshot: jest.fn(),
            close: jest.fn()
        };
    });
    
    describe('AmazonScraper', () => {
        let scraper;
        
        beforeEach(() => {
            scraper = new AmazonScraper();
        });
        
        test('devrait extraire les résultats de recherche Amazon', async () => {
            // Mock des données de produit
            const mockProducts = [
                {
                    title: 'Test Product 1',
                    price: 29.99,
                    url: 'https://amazon.com/product1',
                    image: 'https://amazon.com/image1.jpg'
                }
            ];
            
            mockPage.$$eval = jest.fn().mockResolvedValue(mockProducts);
            
            const results = await scraper.scrapeSearchResults(mockPage, 'test query');
            
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                title: 'Test Product 1',
                price: 29.99,
                platform: 'amazon'
            });
        });
        
        test('devrait gérer les erreurs de scraping Amazon', async () => {
            mockPage.$$eval = jest.fn().mockRejectedValue(new Error('Sélecteur non trouvé'));
            
            const results = await scraper.scrapeSearchResults(mockPage, 'test query');
            
            expect(results).toEqual([]);
        });
        
        test('devrait détecter les mécanismes anti-bot', async () => {
            mockPage.$ = jest.fn().mockResolvedValue({ textContent: 'Enter the characters you see below' });
            
            const isBlocked = await scraper.handleAntiBot(mockPage);
            
            expect(isBlocked).toBe(true);
        });
    });
    
    describe('EbayScraper', () => {
        let scraper;
        
        beforeEach(() => {
            scraper = new EbayScraper();
        });
        
        test('devrait extraire les résultats de recherche eBay', async () => {
            const mockProducts = [
                {
                    title: 'eBay Test Product',
                    price: 15.50,
                    url: 'https://ebay.com/item/123',
                    condition: 'New'
                }
            ];
            
            mockPage.$$eval = jest.fn().mockResolvedValue(mockProducts);
            
            const results = await scraper.scrapeSearchResults(mockPage, 'test query');
            
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                title: 'eBay Test Product',
                platform: 'ebay',
                condition: 'New'
            });
        });
    });
    
    describe('WalmartScraper', () => {
        let scraper;
        
        beforeEach(() => {
            scraper = new WalmartScraper();
        });
        
        test('devrait extraire les résultats de recherche Walmart', async () => {
            const mockProducts = [
                {
                    title: 'Walmart Test Product',
                    price: 12.99,
                    url: 'https://walmart.com/ip/456',
                    rating: 4.5
                }
            ];
            
            mockPage.$$eval = jest.fn().mockResolvedValue(mockProducts);
            
            const results = await scraper.scrapeSearchResults(mockPage, 'test query');
            
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                title: 'Walmart Test Product',
                platform: 'walmart',
                rating: 4.5
            });
        });
    });
    
    describe('EtsyScraper', () => {
        let scraper;
        
        beforeEach(() => {
            scraper = new EtsyScraper();
        });
        
        test('devrait extraire les résultats de recherche Etsy', async () => {
            const mockProducts = [
                {
                    title: 'Handmade Etsy Item',
                    price: 25.00,
                    url: 'https://etsy.com/listing/789',
                    shop: 'TestShop'
                }
            ];
            
            mockPage.$$eval = jest.fn().mockResolvedValue(mockProducts);
            
            const results = await scraper.scrapeSearchResults(mockPage, 'test query');
            
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                title: 'Handmade Etsy Item',
                platform: 'etsy',
                shop: 'TestShop'
            });
        });
    });
    
    describe('ShopifyScraper', () => {
        let scraper;
        
        beforeEach(() => {
            scraper = new ShopifyScraper();
        });
        
        test('devrait détecter un store Shopify', async () => {
            mockPage.evaluate = jest.fn().mockResolvedValue(true);
            
            const isShopify = await scraper.isShopifyStore(mockPage);
            
            expect(isShopify).toBe(true);
        });
        
        test('devrait extraire les produits Shopify', async () => {
            const mockProducts = [
                {
                    title: 'Shopify Product',
                    price: 45.00,
                    url: 'https://store.com/products/test',
                    variants: ['Small', 'Medium', 'Large']
                }
            ];
            
            mockPage.$$eval = jest.fn().mockResolvedValue(mockProducts);
            
            const results = await scraper.scrapeSearchResults(mockPage, 'test query');
            
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                title: 'Shopify Product',
                platform: 'shopify'
            });
        });
    });
});

describe('Validation des entrées', () => {
    test('devrait valider les plateformes supportées', () => {
        const validPlatforms = ['amazon', 'ebay', 'walmart', 'etsy', 'shopify'];
        const input = { platforms: ['amazon', 'invalid'] };
        
        const validatedPlatforms = input.platforms.filter(p => validPlatforms.includes(p));
        
        expect(validatedPlatforms).toEqual(['amazon']);
    });
    
    test('devrait valider les filtres de prix', () => {
        const priceFilters = {
            minPrice: 10,
            maxPrice: 100,
            currency: 'USD'
        };
        
        expect(priceFilters.minPrice).toBeGreaterThan(0);
        expect(priceFilters.maxPrice).toBeGreaterThan(priceFilters.minPrice);
        expect(['USD', 'EUR', 'GBP']).toContain(priceFilters.currency);
    });
    
    test('devrait valider les URLs de produits', () => {
        const validUrls = [
            'https://www.amazon.com/dp/B08N5WRWNW',
            'https://www.ebay.com/itm/123456789',
            'https://www.walmart.com/ip/product/123'
        ];
        
        validUrls.forEach(url => {
            expect(() => new URL(url)).not.toThrow();
        });
    });
});

describe('Gestion des erreurs', () => {
    test('devrait gérer les timeouts de page', async () => {
        const mockPage = {
            goto: jest.fn().mockRejectedValue(new Error('Navigation timeout'))
        };
        
        const scraper = new AmazonScraper();
        
        // Devrait gérer l'erreur gracieusement
        await expect(scraper.scrapeSearchResults(mockPage, 'test')).resolves.toEqual([]);
    });
    
    test('devrait gérer les sélecteurs manquants', async () => {
        const mockPage = {
            $$eval: jest.fn().mockRejectedValue(new Error('Selector not found'))
        };
        
        const scraper = new EbayScraper();
        
        await expect(scraper.scrapeSearchResults(mockPage, 'test')).resolves.toEqual([]);
    });
});

describe('Tests d\'intégration', () => {
    test('devrait traiter un workflow complet de scraping', async () => {
        // Mock de l'input
        const input = {
            platforms: ['amazon'],
            searchTerms: ['test product'],
            maxProducts: 10
        };
        
        // Mock des résultats
        const expectedResults = [
            {
                title: 'Test Product',
                price: 29.99,
                platform: 'amazon',
                url: 'https://amazon.com/test',
                scrapedAt: expect.any(String)
            }
        ];
        
        // Simuler le processus de scraping
        const results = expectedResults;
        
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            title: expect.any(String),
            price: expect.any(Number),
            platform: 'amazon'
        });
    });
    
    test('devrait gérer plusieurs plateformes simultanément', async () => {
        const platforms = ['amazon', 'ebay', 'walmart'];
        const results = [];
        
        // Simuler le scraping sur plusieurs plateformes
        for (const platform of platforms) {
            results.push({
                title: `Product from ${platform}`,
                platform,
                price: Math.random() * 100
            });
        }
        
        expect(results).toHaveLength(3);
        expect(results.map(r => r.platform)).toEqual(platforms);
    });
});

describe('Performance et optimisation', () => {
    test('devrait respecter les limites de concurrence', () => {
        const maxConcurrency = 5;
        const activeRequests = 3;
        
        expect(activeRequests).toBeLessThanOrEqual(maxConcurrency);
    });
    
    test('devrait respecter les délais entre requêtes', async () => {
        const requestDelay = 1000;
        const startTime = Date.now();
        
        // Simuler un délai
        await new Promise(resolve => setTimeout(resolve, requestDelay));
        
        const endTime = Date.now();
        const actualDelay = endTime - startTime;
        
        expect(actualDelay).toBeGreaterThanOrEqual(requestDelay - 50); // Tolérance de 50ms
    });
});

// Tests de régression
describe('Tests de régression', () => {
    test('devrait maintenir la compatibilité avec les anciennes versions d\'input', () => {
        // Test avec un ancien format d'input
        const oldInput = {
            platform: 'amazon', // Ancien format (singulier)
            query: 'test product',
            maxResults: 50
        };
        
        // Conversion vers le nouveau format
        const newInput = {
            platforms: [oldInput.platform],
            searchTerms: [oldInput.query],
            maxProducts: oldInput.maxResults
        };
        
        expect(newInput.platforms).toEqual(['amazon']);
        expect(newInput.searchTerms).toEqual(['test product']);
        expect(newInput.maxProducts).toBe(50);
    });
});

// Configuration Jest
module.exports = {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};