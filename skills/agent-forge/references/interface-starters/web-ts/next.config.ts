import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Turbopack is enabled in dev via `next dev --turbopack` (see package.json).
  // No experimental flags are required in Next.js 15.
  experimental: {},
};

export default nextConfig;
