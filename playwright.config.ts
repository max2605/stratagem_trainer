import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './shared/sourcecode/tests/e2e',
  use: { baseURL: 'http://127.0.0.1:5173' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } }
  ]
});
