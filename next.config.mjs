import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Include all playwright-related files in the serverless bundle
  outputFileTracingIncludes: {
    '/api/e2e/**/*': [
      './playwright.config.ts',
      './playwright.staging.config.ts',
      './playwright.hub.config.ts',
      './.env.staging',
      './.env.example',
      './e2e/**/*',
      './node_modules/.bin/playwright',
      './node_modules/@playwright/**/*',
      './node_modules/playwright/**/*',
      './node_modules/playwright-core/**/*',
      './node_modules/dotenv/**/*',
    ],
  },
}

export default nextConfig
