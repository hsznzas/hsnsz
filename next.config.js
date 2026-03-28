/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@resvg/resvg-js', 'sharp', '@sparticuz/chromium', 'puppeteer-core'],
  },
}

module.exports = nextConfig
