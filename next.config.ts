import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint enabled for production builds - ensures code quality
    ignoreDuringBuilds: false,
    dirs: ['pages', 'components', 'lib', 'app'],
  },
  typescript: {
    // TypeScript checking enabled for production builds - prevents type errors
    ignoreBuildErrors: false,
  },
  // Removed compiler config to avoid styled-jsx issues
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase from default 1MB to 10MB for file uploads
    },
  },
};

export default nextConfig;
