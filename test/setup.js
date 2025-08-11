/**
 * Configuration et setup pour les tests Jest
 */

// Configuration globale pour les tests
global.console = {
  ...console,
  // Désactiver les logs pendant les tests sauf les erreurs
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error
};

// Mock des variables d'environnement Apify
process.env.APIFY_ACTOR_ID = 'test-actor-id';
process.env.APIFY_ACTOR_RUN_ID = 'test-run-id';
process.env.APIFY_ACTOR_TASK_ID = 'test-task-id';
process.env.APIFY_DEFAULT_DATASET_ID = 'test-dataset-id';
process.env.APIFY_DEFAULT_KEY_VALUE_STORE_ID = 'test-kvs-id';
process.env.APIFY_DEFAULT_REQUEST_QUEUE_ID = 'test-queue-id';
process.env.APIFY_INPUT_KEY = 'INPUT';
process.env.APIFY_HEADLESS = '1';
process.env.APIFY_XVFB = '1';

// Mock d'Apify SDK
jest.mock('apify', () => ({
  main: jest.fn((handler) => handler()),
  getInput: jest.fn(() => Promise.resolve({})),
  setValue: jest.fn(() => Promise.resolve()),
  getValue: jest.fn(() => Promise.resolve(null)),
  pushData: jest.fn(() => Promise.resolve()),
  openDataset: jest.fn(() => Promise.resolve({
    pushData: jest.fn(() => Promise.resolve()),
    getData: jest.fn(() => Promise.resolve({ items: [] })),
    exportToCSV: jest.fn(() => Promise.resolve('csv,data')),
    exportToJSON: jest.fn(() => Promise.resolve('[]'))
  })),
  openKeyValueStore: jest.fn(() => Promise.resolve({
    setValue: jest.fn(() => Promise.resolve()),
    getValue: jest.fn(() => Promise.resolve(null))
  })),
  openRequestQueue: jest.fn(() => Promise.resolve({
    addRequest: jest.fn(() => Promise.resolve()),
    fetchNextRequest: jest.fn(() => Promise.resolve(null)),
    markRequestHandled: jest.fn(() => Promise.resolve()),
    reclaimRequest: jest.fn(() => Promise.resolve())
  })),
  launchPlaywright: jest.fn(() => Promise.resolve({
    newContext: jest.fn(() => Promise.resolve({
      newPage: jest.fn(() => Promise.resolve({
        goto: jest.fn(() => Promise.resolve()),
        waitForSelector: jest.fn(() => Promise.resolve()),
        $: jest.fn(() => Promise.resolve(null)),
        $$: jest.fn(() => Promise.resolve([])),
        evaluate: jest.fn(() => Promise.resolve()),
        screenshot: jest.fn(() => Promise.resolve()),
        close: jest.fn(() => Promise.resolve())
      }))
    })),
    close: jest.fn(() => Promise.resolve())
  })),
  utils: {
    log: {
      info: jest.fn(),
      debug: jest.fn(),
      warning: jest.fn(),
      error: jest.fn()
    },
    sleep: jest.fn((ms) => Promise.resolve()),
    requestAsBrowser: jest.fn(() => Promise.resolve({ body: '', statusCode: 200 }))
  },
  call: jest.fn(() => Promise.resolve({ defaultDatasetId: 'test-dataset' }))
}));

// Mock de Playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(() => Promise.resolve({
      newContext: jest.fn(() => Promise.resolve({
        newPage: jest.fn(() => Promise.resolve({
          goto: jest.fn(() => Promise.resolve()),
          waitForSelector: jest.fn(() => Promise.resolve()),
          waitForLoadState: jest.fn(() => Promise.resolve()),
          $: jest.fn(() => Promise.resolve(null)),
          $$: jest.fn(() => Promise.resolve([])),
          $eval: jest.fn(() => Promise.resolve()),
          $$eval: jest.fn(() => Promise.resolve([])),
          evaluate: jest.fn(() => Promise.resolve()),
          screenshot: jest.fn(() => Promise.resolve()),
          setViewportSize: jest.fn(() => Promise.resolve()),
          setUserAgent: jest.fn(() => Promise.resolve()),
          setExtraHTTPHeaders: jest.fn(() => Promise.resolve()),
          close: jest.fn(() => Promise.resolve()),
          url: jest.fn(() => 'https://example.com'),
          title: jest.fn(() => Promise.resolve('Test Page')),
          content: jest.fn(() => Promise.resolve('<html></html>'))
        }))
      })),
      close: jest.fn(() => Promise.resolve())
    }))
  },
  firefox: {
    launch: jest.fn(() => Promise.resolve({
      newContext: jest.fn(() => Promise.resolve({
        newPage: jest.fn(() => Promise.resolve({}))
      })),
      close: jest.fn(() => Promise.resolve())
    }))
  },
  webkit: {
    launch: jest.fn(() => Promise.resolve({
      newContext: jest.fn(() => Promise.resolve({
        newPage: jest.fn(() => Promise.resolve({}))
      })),
      close: jest.fn(() => Promise.resolve())
    }))
  }
}));

// Mock de Cheerio
jest.mock('cheerio', () => ({
  load: jest.fn(() => ({
    $: jest.fn(() => ({
      text: jest.fn(() => 'test text'),
      attr: jest.fn(() => 'test-attr'),
      find: jest.fn(() => ({
        text: jest.fn(() => 'test text'),
        attr: jest.fn(() => 'test-attr'),
        length: 1
      })),
      length: 1
    }))
  }))
}));

// Mock d'Axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ 
    data: '<html><body>Test</body></html>',
    status: 200,
    headers: {}
  })),
  post: jest.fn(() => Promise.resolve({ 
    data: { success: true },
    status: 200 
  })),
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({ data: 'test' })),
    post: jest.fn(() => Promise.resolve({ data: 'test' }))
  }))
}));

// Mock de Lodash
jest.mock('lodash', () => ({
  debounce: jest.fn((fn) => fn),
  throttle: jest.fn((fn) => fn),
  chunk: jest.fn((arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }),
  uniq: jest.fn((arr) => [...new Set(arr)]),
  shuffle: jest.fn((arr) => [...arr]),
  sample: jest.fn((arr) => arr[0]),
  isEmpty: jest.fn((val) => !val || val.length === 0),
  isString: jest.fn((val) => typeof val === 'string'),
  isNumber: jest.fn((val) => typeof val === 'number'),
  isArray: jest.fn((val) => Array.isArray(val))
}));

// Mock de Moment
jest.mock('moment', () => {
  const moment = jest.requireActual('moment');
  return {
    ...moment,
    default: jest.fn(() => ({
      format: jest.fn(() => '2023-01-01T00:00:00Z'),
      toISOString: jest.fn(() => '2023-01-01T00:00:00.000Z'),
      valueOf: jest.fn(() => 1672531200000)
    }))
  };
});

// Mock de User-Agents
jest.mock('user-agents', () => {
  return jest.fn(() => ({
    toString: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }));
});

// Helpers pour les tests
global.testHelpers = {
  // Créer un mock de page Playwright
  createMockPage: (overrides = {}) => ({
    goto: jest.fn(() => Promise.resolve()),
    waitForSelector: jest.fn(() => Promise.resolve()),
    $: jest.fn(() => Promise.resolve(null)),
    $$: jest.fn(() => Promise.resolve([])),
    $eval: jest.fn(() => Promise.resolve()),
    $$eval: jest.fn(() => Promise.resolve([])),
    evaluate: jest.fn(() => Promise.resolve()),
    screenshot: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
    url: jest.fn(() => 'https://example.com'),
    title: jest.fn(() => Promise.resolve('Test Page')),
    ...overrides
  }),
  
  // Créer des données de produit de test
  createMockProduct: (platform = 'amazon', overrides = {}) => ({
    title: 'Test Product',
    price: 29.99,
    currency: 'USD',
    url: `https://${platform}.com/product/test`,
    image: `https://${platform}.com/image.jpg`,
    platform,
    availability: 'In Stock',
    rating: 4.5,
    reviewCount: 100,
    scrapedAt: new Date().toISOString(),
    ...overrides
  }),
  
  // Créer un input de test
  createMockInput: (overrides = {}) => ({
    platforms: ['amazon'],
    searchTerms: ['test product'],
    maxProducts: 10,
    trackPrices: true,
    trackStock: true,
    ...overrides
  }),
  
  // Attendre un délai
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Générer des données aléatoires
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  randomNumber: (min = 1, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomPrice: () => Math.round((Math.random() * 100 + 1) * 100) / 100
};

// Configuration des timeouts pour les tests
jest.setTimeout(30000);

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// Configuration globale avant tous les tests
beforeAll(() => {
  // Désactiver les warnings de Node.js pour les tests
  process.removeAllListeners('warning');
});

// Nettoyage après tous les tests
afterAll(() => {
  // Nettoyer les timers
  jest.clearAllTimers();
  jest.useRealTimers();
});