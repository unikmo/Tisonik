import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'tablet-chromium', use: { ...devices['iPad (gen 7)'], browserName: 'chromium' } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /readiness\.spec\.ts/ },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /readiness\.spec\.ts/ },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] }, testIgnore: /readiness\.spec\.ts/ },
  ],
  webServer: { command: 'node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174', url: 'http://127.0.0.1:4174', reuseExistingServer: false },
})
