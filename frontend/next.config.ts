/** @type {import('next').NextConfig} */
const nextConfig = {
  // enable SWC minification
  swcMinify: true,

  // code splitting — each dynamic import becomes its own chunk
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig