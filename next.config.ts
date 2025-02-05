import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  eslint: {
    // Warning: Allows production builds to successfully complete even if
    // project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;