import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/', 'coverage/', 'playwright-report/', 'test-results/'],
  },

  js.configs.recommended,

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'error',
      'no-alert': 'warn',
      eqeqeq: 'error',
      'prefer-const': 'error',
    },
  },

  {
    files: ['src/__tests__/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },

  {
    files: ['e2e/**/*.js', '*.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
