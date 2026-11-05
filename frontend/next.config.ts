import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Server-only destination, captured at build time. Keep browser URLs relative.
    const upstream = new URL(
      process.env.API_PROXY_TARGET ?? "http://localhost:8080",
    );
    if (
      !["http:", "https:"].includes(upstream.protocol) ||
      upstream.username ||
      upstream.password ||
      upstream.pathname !== "/" ||
      upstream.search ||
      upstream.hash
    ) {
      throw new Error(
        "API_PROXY_TARGET must be an HTTP(S) origin without credentials, path, query, or fragment",
      );
    }
    return [
      { source: "/api/:path*", destination: `${upstream.origin}/api/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
