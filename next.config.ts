import type { NextConfig } from "next";

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
    // The `ws` package uses `__dirname` which doesn't exist in the Edge
    // Runtime. Since middleware runs on Edge and Supabase's realtime-js
    // pulls in ws, we alias it to false so the bundler replaces it with
    // an empty module. Supabase SSR only needs the REST/auth client in
    // middleware — realtime channels are never opened there.
    config.resolve.alias = {
      ...config.resolve.alias,
      ws: false,
    };
    return config;
  },
};

export default nextConfig;
