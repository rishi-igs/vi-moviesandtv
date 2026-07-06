/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['lighthouse', 'chrome-launcher'],
  },
}

module.exports = nextConfig
