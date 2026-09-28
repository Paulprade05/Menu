import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev badge (it covered the tab bar); errors are still shown
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "prod-mercadona.imgix.net",
      },
      {
        protocol: "https",
        hostname: "tienda.mercadona.es",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // The service worker must never be cached, or phones would keep old versions
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
