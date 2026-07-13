/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['lighthouse', 'chrome-launcher'],
  },
  // Serves the built Vite dashboard (public/app/, built via `vite build` —
  // see vite.config.js) at the root URL, so the live dashboard and the API
  // routes run from one process/one port instead of two separate dev
  // servers. beforeFiles runs ahead of Next's own file-based routing, so
  // this takes priority over src/app/page.tsx (the old, unused Next UI)
  // without needing to delete that file.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/app/index.html' },
      ],
    }
  },
}

module.exports = nextConfig
