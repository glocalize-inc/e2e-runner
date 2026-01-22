import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@playwright/test', 'playwright', 'playwright-core'],
  outputFileTracingRoot: __dirname,
}

export default nextConfig
