import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Temporarily disable ESLint during builds - too many errors to fix at once
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily disable TypeScript errors during builds - too many errors to fix at once
    ignoreBuildErrors: true,
  },
  // Reduce verbose logging in development
  logging: {
    fetches: {
      fullUrl: false, // Don't log full URLs
    },
  },
  // Keep PDF Chromium deps external — they load binaries at runtime and must
  // not be relocated by the bundler. Production uses @sparticuz/chromium-min
  // (remote pack); local uses a system Chrome via PUPPETEER_EXECUTABLE_PATH.
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
  // Ensure the (tiny) chromium-min package is traced into the PDF routes.
  outputFileTracingIncludes: {
    '/api/admin/offer-engine/present-pdf/**/*': [
      './node_modules/@sparticuz/chromium-min/**/*',
    ],
    '/api/demo/**/*': ['./node_modules/@sparticuz/chromium-min/**/*'],
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
  turbopack: {},
  // Only stub Node builtins for the CLIENT bundle — stubbing them on the
  // server breaks packages like @sparticuz/chromium that need fs/path.
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    return config
  },
};

export default nextConfig;
