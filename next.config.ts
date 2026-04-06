import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  reactStrictMode: true,
  // ws is used by @supabase/realtime-js (server-side only, not Edge middleware)
  serverExternalPackages: ["ws"],
};

export default nextConfig;
