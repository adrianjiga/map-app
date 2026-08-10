import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/map-app/`;

// Escape hatch for environments that ship a Chromium build Playwright did not
// download itself. Unset, Playwright resolves its own bundled browser.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // The app refuses to initialise without a position.
    permissions: ['geolocation'],
    geolocation: { latitude: 51.505, longitude: -0.09 },
    launchOptions: { executablePath },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],

  // Deliberately the production build, not the dev server: the broken marker
  // icons this suite guards against only reproduce after bundling.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
