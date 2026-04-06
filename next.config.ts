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
  webpack: (config, { nextRuntime, webpack: wp }) => {
    // The `ws` package (dep of @supabase/realtime-js) uses `__dirname` which
    // doesn't exist in Edge Runtime, crashing middleware on every request.
    // Fix: alias ws to a lightweight shim AND define __dirname for Edge so
    // any residual references don't throw ReferenceError.
    config.resolve.alias = {
      ...config.resolve.alias,
      ws: path.resolve(process.cwd(), "lib/ws-shim.js"),
    };

    if (nextRuntime === "edge") {
      config.plugins.push(
        new wp.DefinePlugin({
          __dirname: JSON.stringify("/"),
          __filename: JSON.stringify("/index.js"),
        })
      );
    }

    return config;
  },
};

export default nextConfig;
