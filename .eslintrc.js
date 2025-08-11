module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'airbnb-base'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Règles de style
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'max-len': ['error', { code: 120, ignoreUrls: true }],
    
    // Règles de variables
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Règles de fonctions
    'arrow-spacing': 'error',
    'prefer-arrow-callback': 'error',
    'func-style': ['error', 'expression'],
    
    // Règles d'objets et tableaux
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'object-shorthand': 'error',
    
    // Règles de promesses et async/await
    'no-async-promise-executor': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'error',
    
    // Règles spécifiques au scraping
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Règles de sécurité
    'no-script-url': 'error',
    'no-alert': 'error',
    
    // Règles de performance
    'no-loop-func': 'error',
    'no-inner-declarations': 'error',
    
    // Règles d'import/export
    'import/no-unresolved': 'off', // Désactivé car Apify SDK peut ne pas être résolu
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
    
    // Règles spécifiques aux tests
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error'
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js', '**/test/**/*.js'],
      env: {
        jest: true
      },
      plugins: ['jest'],
      rules: {
        'no-console': 'off',
        'max-len': 'off',
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error'
      }
    },
    {
      files: ['main.js'],
      rules: {
        'no-console': 'off' // Autorisé dans le fichier principal
      }
    },
    {
      files: ['src/scrapers/**/*.js'],
      rules: {
        'class-methods-use-this': 'off', // Les méthodes de scraping peuvent ne pas utiliser this
        'no-await-in-loop': 'off', // Parfois nécessaire pour le scraping séquentiel
        'no-restricted-syntax': 'off' // for...of loops sont utiles pour le scraping
      }
    }
  ],
  globals: {
    // Variables globales Apify
    'Apify': 'readonly',
    'Actor': 'readonly',
    
    // Variables globales de test
    'testHelpers': 'readonly'
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.json']
      }
    }
  }
};