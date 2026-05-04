import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: path.resolve(__dirname), // Set explicit absolute root path
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['import-in-the-middle', 'require-in-the-middle'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_MAPTILER_API_KEY: process.env.NEXT_PUBLIC_MAPTILER_API_KEY,
  }
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  silent: true, // Suppresses all logs
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Upload source maps during build
  widenClientFileUpload: true,

  // Hide source maps from public
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements - use webpack treeshake instead
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

// Export the Sentry-wrapped config
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
