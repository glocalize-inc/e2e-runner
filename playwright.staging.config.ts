import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import dotenv from 'dotenv'
import { AUTH_FILE, isVercel } from './e2e/constants'

dotenv.config({ path: path.resolve(__dirname, '.env.staging') })

// Use /tmp for output in Vercel environment (read-only filesystem)
const outputDir = isVercel ? '/tmp/e2e/test-results-staging' : './e2e/test-results-staging'
const reportDir = isVercel ? '/tmp/e2e/playwright-report' : './public/e2e/playwright-report'

export default defineConfig({
  testDir: './e2e',
  outputDir,
  timeout: 60 * 1000,

  expect: {
    timeout: 10 * 1000,
  },

  fullyParallel: true,
  forbidOnly: true,
  retries: 2,
  workers: 3,

  reporter: [
    ['html', { outputFolder: reportDir, open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://gloz-dev.gloground.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
  ],
})
