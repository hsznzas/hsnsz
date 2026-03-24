/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@resvg/resvg-js', 'sharp'],
  },
}

module.exports = nextConfig
