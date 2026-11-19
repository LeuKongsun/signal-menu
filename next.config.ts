import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/api/order": ["./assets/fonts/**/*", "./public/aba-qr.jpg"],
    "/api/telegram-webhook": [
      "./assets/fonts/**/*",
      "./public/drinks/**/*",
      "./public/making-coffee.gif",
    ],
  },
};

export default nextConfig;
