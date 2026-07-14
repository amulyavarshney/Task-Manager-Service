import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke tests. Default baseURL is the Vite UI.
 * Start stack first: backend on :8080, frontend on :5173
 *   or: docker compose up --build
 * Then: npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      'X-API-Key': process.env.PLAYWRIGHT_API_KEY ?? 'dev-admin-key',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
