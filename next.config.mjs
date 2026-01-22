/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@playwright/test', 'playwright', 'playwright-core'],
}

export default nextConfig
