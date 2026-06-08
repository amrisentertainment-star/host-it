import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Next.js NOT to try and "bundle" this library. 
  // It will be treated as a standard Node.js module on the server.
  serverExternalPackages: ["tiktok-live-connector"],
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
