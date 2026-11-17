import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/api/order": ["./assets/fonts/**/*"],
    "/api/telegram-webhook": ["./assets/fonts/**/*", "./public/drinks/**/*"],
  },
};

export default nextConfig;
