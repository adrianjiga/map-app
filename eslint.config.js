import globals from 'globals';

export default [
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
];
