/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'], // Allow Google profile images
  },
  output: 'standalone',
}

module.exports = nextConfig