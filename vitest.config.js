import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    coverage: {
      // Without `all`, coverage only counts files a test happens to import,
      // which hides untested modules behind a flattering percentage.
      all: true,
      include: ['src/**/*.js'],
      exclude: ['src/__tests__/**', 'src/main.js'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
});
