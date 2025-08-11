module.exports = {
  // Environnement de test
  testEnvironment: 'node',
  
  // Répertoires de tests
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Fichiers à ignorer
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Configuration de couverture
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  // Fichiers à inclure dans la couverture
  collectCoverageFrom: [
    'src/**/*.js',
    'main.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  
  // Seuils de couverture
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Configuration des modules
  moduleFileExtensions: [
    'js',
    'json'
  ],
  
  // Transformation des fichiers
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Configuration des mocks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Timeout pour les tests
  testTimeout: 30000,
  
  // Configuration des reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'report.html',
      expand: true
    }]
  ],
  
  // Variables d'environnement pour les tests
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  
  // Configuration des modules externes
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Verbose output
  verbose: true
};