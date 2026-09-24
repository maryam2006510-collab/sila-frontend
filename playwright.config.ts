// Playwright E2E: runs the app in mock mode against the locally installed Microsoft Edge
// (no browser download). `npm run test:e2e`
import { defineConfig } from '@playwright/test';

const PORT = 5180;

export default defineConfig({
  testDir: './e2e',
  // One warm-up visit before the tests (see e2e/global-setup.ts)
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'msedge',
    headless: true,
    locale: 'ar-IQ',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec/ },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      testMatch: /mobile\.spec/,
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    env: { VITE_USE_MOCK: 'true' },
  },
});
