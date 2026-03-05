/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for the multi-stage Docker build (copies .next/standalone)
  output: 'standalone',
  // ESLint runs as a separate CI step; don't block production builds
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
