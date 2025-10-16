import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Re-enabling ESLint to check current error count
    ignoreDuringBuilds: false,
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
