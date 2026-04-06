import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  reactStrictMode: true,
  serverExternalPackages: ["ws"],
  webpack: (config) => {
    // The `ws` package uses `__dirname` which doesn't exist in Edge Runtime.
    // Replace it with a minimal shim that delegates to the global WebSocket
    // (available on Edge natively). This prevents the middleware from crashing.
    config.resolve.alias = {
      ...config.resolve.alias,
      ws: path.resolve(process.cwd(), "lib/ws-shim.js"),
    };
    return config;
  },
};

export default nextConfig;
