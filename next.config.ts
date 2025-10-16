import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Re-enabled ESLint after fixing critical issues
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Re-enabled TypeScript checking after fixing critical issues
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
