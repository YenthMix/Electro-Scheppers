import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // N8N removed - using direct Botpress Chat API integration
    BACKEND_URL: process.env.BACKEND_URL,
  },
};

export default nextConfig;
