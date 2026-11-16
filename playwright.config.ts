import { defineConfig, devices } from '@playwright/test'

/**
 * Rooktests van het dashboard in demomodus (geen Supabase, geen login, data in het geheugen).
 * Lokaal: `npm run e2e`. In CI draait dezelfde set na de unit tests.
 */
const PORT = 3150

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'gsm', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/admin`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: { IKR_ADMIN_DEMO: 'true', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
  },
})
