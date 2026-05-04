import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  workboxOptions: {
    disableDevLogs: true,
    exclude: [
      // Exclude large Next.js chunks and source maps from precaching
      // This prevents Out of Memory errors on the initial load caused by downloading too many chunks
      /middleware-manifest\.json$/,
      /_buildManifest\.js$/,
      /_ssgManifest\.js$/,
      /\.map$/,
      /^.*\/chunks\/.*\.js$/, // Do not precache JS chunks at install time
    ],
    maximumFileSizeToCacheInBytes: 5000000, // Limit maximum file size to cache (5MB)
  },
});

const isStaticExport = true;

/** @type {import('next').NextConfig} */
const nextConfig: any = {
  trailingSlash: true,
  output: isStaticExport ? 'export' : undefined,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    BUILD_STATIC_EXPORT: JSON.stringify(isStaticExport),
  },
  webpack(config: any) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default withPWA(nextConfig);
