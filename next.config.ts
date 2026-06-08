import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // This forces Next.js to use the standard SWC compiler 
  // which handles TypeScript automatically.
  swcMinify: true, 
};

export default nextConfig;
