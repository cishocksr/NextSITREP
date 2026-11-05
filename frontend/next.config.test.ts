import { afterEach, describe, expect, it, vi } from "vitest";
import nextConfig from "./next.config";

afterEach(() => vi.unstubAllEnvs());

describe("same-origin API proxy", () => {
  it("routes only API paths to the private upstream and preserves the API path", async () => {
    vi.stubEnv("API_PROXY_TARGET", "http://backend:8080");
    expect(await nextConfig.rewrites?.()).toEqual([
      { source: "/api/:path*", destination: "http://backend:8080/api/:path*" },
    ]);
  });

  it.each([
    "ftp://backend",
    "http://user:password@backend",
    "http://backend/prefix",
    "http://backend?key=value",
    "http://backend#fragment",
  ])("rejects an unsafe upstream: %s", async (target) => {
    vi.stubEnv("API_PROXY_TARGET", target);
    await expect(nextConfig.rewrites?.()).rejects.toThrow(
      "API_PROXY_TARGET must be an HTTP(S) origin",
    );
  });
});

describe("baseline response headers", () => {
  it("preserves anti-framing, nosniff, referrer and permissions policies", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules?.[0]?.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ]),
    );
  });
});
