/**
 * Exemples d'utilisation de l'Actor Scraper E-commerce Multi-plateformes
 * 
 * Ce fichier contient des exemples pratiques pour différents cas d'usage
 */

const Apify = require('apify');

// Exemple 1: Recherche basique sur toutes les plateformes
async function basicSearch() {
    const input = {
        platforms: ['amazon', 'ebay', 'walmart', 'etsy'],
        searchTerms: ['wireless headphones', 'bluetooth speaker'],
        maxProducts: 50,
        trackPrices: true,
        trackStock: true
    };
    
    console.log('🔍 Recherche basique:', input);
    
    // Lancer l'actor
    const run = await Apify.call('your-actor-name', input);
    
    // Récupérer les résultats
    const dataset = await Apify.openDataset(run.defaultDatasetId);
    const results = await dataset.getData();
    
    console.log(`✅ ${results.items.length} produits trouvés`);
    return results.items;
}

// Exemple 2: Surveillance de prix pour des produits spécifiques
async function priceMonitoring() {
    const input = {
        platforms: ['amazon', 'walmart'],
        productUrls: [
            'https://www.amazon.com/dp/B08N5WRWNW',
            'https://www.walmart.com/ip/Apple-iPhone-14-Pro-128GB-Deep-Purple/1234567890'
        ],
        trackPrices: true,
        notifications: {
            email: 'alerts@company.com',
            priceAlerts: true,
            stockAlerts: true
        },
        maxConcurrency: 2,
        requestDelay: 2000
    };
    
    console.log('💰 Surveillance de prix:', input);
    
    const run = await Apify.call('your-actor-name', input);
    const dataset = await Apify.openDataset(run.defaultDatasetId);
    const results = await dataset.getData();
    
    // Analyser les changements de prix
    results.items.forEach(product => {
        if (product.discount && product.discount > 10) {
            console.log(`🔥 Promotion détectée: ${product.title} - ${product.discount}% de réduction`);
        }
    });
    
    return results.items;
}

// Exemple 3: Analyse de marché avec filtres avancés
async function marketAnalysis() {
    const input = {
        platforms: ['amazon', 'ebay', 'walmart'],
        searchTerms: ['gaming laptop', 'gaming notebook'],
        maxProducts: 200,
        priceFilters: {
            minPrice: 500,
            maxPrice: 2000,
            currency: 'USD'
        },
        categoryFilters: ['Electronics', 'Computers'],
        includeReviews: true,
        includeDescriptions: true,
        trackTrends: true,
        excludeOutOfStock: true
    };
    
    console.log('📊 Analyse de marché:', input);
    
    const run = await Apify.call('your-actor-name', input);
    const dataset = await Apify.openDataset(run.defaultDatasetId);
    const results = await dataset.getData();
    
    // Analyser les données
    const analysis = {
        totalProducts: results.items.length,
        averagePrice: 0,
        priceRange: { min: Infinity, max: 0 },
        topRated: [],
        platformDistribution: {}
    };
    
    results.items.forEach(product => {
        // Prix moyen
        if (product.price) {
            analysis.averagePrice += product.price;
            analysis.priceRange.min = Math.min(analysis.priceRange.min, product.price);
            analysis.priceRange.max = Math.max(analysis.priceRange.max, product.price);
        }
        
        // Distribution par plateforme
        analysis.platformDistribution[product.platform] = 
            (analysis.platformDistribution[product.platform] || 0) + 1;
        
        // Produits les mieux notés
        if (product.rating && product.rating >= 4.5 && product.reviewCount >= 100) {
            analysis.topRated.push({
                title: product.title,
                rating: product.rating,
                reviews: product.reviewCount,
                price: product.price,
                platform: product.platform
            });
        }
    });
    
    analysis.averagePrice = analysis.averagePrice / results.items.length;
    analysis.topRated.sort((a, b) => b.rating - a.rating).slice(0, 10);
    
    console.log('📈 Résultats de l\'analyse:', analysis);
    return analysis;
}

// Exemple 4: Scraping de stores Shopify personnalisés
async function shopifyStores() {
    const input = {
        platforms: ['shopify'],
        shopifyDomains: [
            'allbirds.com',
            'gymshark.com',
            'mvmt.com'
        ],
        searchTerms: ['sneakers', 'shoes'],
        maxProducts: 100,
        includeImages: true,
        includeDescriptions: true
    };
    
    console.log('🛍️ Scraping stores Shopify:', input);
    
    const run = await Apify.call('your-actor-name', input);
    const dataset = await Apify.openDataset(run.defaultDatasetId);
    const results = await dataset.getData();
    
    // Grouper par store
    const storeResults = {};
    results.items.forEach(product => {
        const domain = new URL(product.url).hostname;
        if (!storeResults[domain]) {
            storeResults[domain] = [];
        }
        storeResults[domain].push(product);
    });
    
    console.log('🏪 Résultats par store:', Object.keys(storeResults).map(domain => ({
        domain,
        productCount: storeResults[domain].length
    })));
    
    return storeResults;
}

// Exemple 5: Configuration avancée avec sélecteurs personnalisés
async function advancedConfiguration() {
    const input = {
        platforms: ['amazon'],
        searchTerms: ['mechanical keyboard'],
        maxProducts: 50,
        proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
            apifyProxyCountry: 'US'
        },
        advancedOptions: {
            customSelectors: {
                title: '#productTitle, .product-title',
                price: '.a-price .a-offscreen, .price',
                availability: '#availability span, .stock-status'
            },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            enableJavaScript: true,
            screenshotOnError: true
        },
        maxConcurrency: 3,
        requestDelay: 1500
    };
    
    console.log('⚙️ Configuration avancée:', input);
    
    const run = await Apify.call('your-actor-name', input);
    const dataset = await Apify.openDataset(run.defaultDatasetId);
    const results = await dataset.getData();
    
    return results.items;
}

// Exemple 6: Export et traitement des données
async function dataProcessing() {
    const input = {
        platforms: ['amazon', 'ebay'],
        searchTerms: ['vintage watch'],
        maxProducts: 100,
        outputFormat: 'csv'
    };
    
    console.log('📊 Traitement des données:', input);
    
    const run = await Apify.call('your-actor-name', input);
    const dataset = await Apify.openDataset(run.defaultDatasetId);
    
    // Export en CSV
    const csvData = await dataset.exportToCSV();
    console.log('📄 Données exportées en CSV');
    
    // Traitement des données
    const results = await dataset.getData();
    
    // Statistiques
    const stats = {
        totalProducts: results.items.length,
        platforms: [...new Set(results.items.map(p => p.platform))],
        priceStats: {
            min: Math.min(...results.items.filter(p => p.price).map(p => p.price)),
            max: Math.max(...results.items.filter(p => p.price).map(p => p.price)),
            avg: results.items.filter(p => p.price).reduce((sum, p) => sum + p.price, 0) / 
                 results.items.filter(p => p.price).length
        },
        availability: {
            inStock: results.items.filter(p => p.availability === 'In Stock').length,
            outOfStock: results.items.filter(p => p.availability === 'Out of Stock').length
        }
    };
    
    console.log('📈 Statistiques:', stats);
    return { data: results.items, stats, csvData };
}

// Fonction principale pour tester les exemples
async function main() {
    try {
        console.log('🚀 Démarrage des exemples d\'utilisation\n');
        
        // Décommenter l'exemple que vous voulez tester
        
        // await basicSearch();
        // await priceMonitoring();
        // await marketAnalysis();
        // await shopifyStores();
        // await advancedConfiguration();
        // await dataProcessing();
        
        console.log('\n✅ Exemples terminés');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Exporter les fonctions pour utilisation externe
module.exports = {
    basicSearch,
    priceMonitoring,
    marketAnalysis,
    shopifyStores,
    advancedConfiguration,
    dataProcessing
};

// Exécuter si appelé directement
if (require.main === module) {
    main();
}