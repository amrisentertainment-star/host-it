import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tiktok-live-connector"],
  
  // Custom Webpack configuration to ignore .proto files
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.module.rules.push({
        test: /\.proto$/,
        use: 'raw-loader', // Requires raw-loader or just null-loader
      });
    }
    return config;
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
