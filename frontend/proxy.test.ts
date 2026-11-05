import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("document security policy", () => {
  it("uses a fresh nonce for Next and CSP without production script exceptions", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HTTPS_DEPLOYMENT", "true");
    const request = new NextRequest("https://app.example.test/login", {
      headers: {
        "x-nonce": "attacker",
        "Content-Security-Policy": "default-src *",
      },
    });
    const first = proxy(request);
    const second = proxy(request);
    const policy = first.headers.get("Content-Security-Policy");
    const nonce = first.headers.get("x-middleware-request-x-nonce");
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(nonce).not.toBe(second.headers.get("x-middleware-request-x-nonce"));
    expect(policy).toContain(
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    );
    const scriptPolicy = policy
      ?.split(";")
      .find((directive) => directive.trim().startsWith("script-src"));
    expect(scriptPolicy).not.toContain("unsafe-inline");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    expect(policy).toContain(`style-src 'self' 'nonce-${nonce}'`);
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(
      first.headers.get("x-middleware-request-content-security-policy"),
    ).toBe(policy);
    expect(first.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000",
    );
    expect(first.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("keeps HTTP development working and scopes eval/websockets to development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("HTTPS_DEPLOYMENT", "false");
    const response = proxy(
      new NextRequest("http://localhost:3000/login", {
        headers: { "x-forwarded-proto": "https" },
      }),
    );
    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "unsafe-eval",
    );
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "connect-src 'self' ws: wss:",
    );
    expect(response.headers.get("Content-Security-Policy")).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("does not treat next start on HTTP as an HTTPS deployment", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HTTPS_DEPLOYMENT", "false");
    const response = proxy(new NextRequest("http://localhost:3000"));
    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).not.toContain(
      "unsafe-eval",
    );
    expect(response.headers.get("Content-Security-Policy")).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("rejects an invalid HTTPS deployment flag", () => {
    vi.stubEnv("HTTPS_DEPLOYMENT", "yes");
    expect(() => proxy(new NextRequest("https://app.example.test"))).toThrow(
      "HTTPS_DEPLOYMENT must be true or false",
    );
  });
});

describe("API forwarding boundary", () => {
  it.each(["true", "false"])(
    "normalizes API metadata with HTTPS_DEPLOYMENT=%s with a JSON-only fallback CSP",
    (flag) => {
      vi.stubEnv("HTTPS_DEPLOYMENT", flag);
      const response = proxy(
        new NextRequest("http://localhost:3000/api/v1/auth/csrf", {
          headers: {
            Forwarded: "for=203.0.113.9;proto=https;host=evil.test",
            "X-Forwarded-For": "203.0.113.9",
            "X-Forwarded-Proto": "attacker",
            "X-Forwarded-Host": "evil.test",
            "X-Forwarded-Port": "9999",
            "X-Real-IP": "203.0.113.9",
            Cookie: "XSRF-TOKEN=synthetic",
            "X-XSRF-TOKEN": "synthetic",
          },
        }),
      );
      expect(
        response.headers.get("x-middleware-request-x-forwarded-proto"),
      ).toBe(flag === "true" ? "https" : "http");
      for (const header of [
        "forwarded",
        "x-forwarded-for",
        "x-forwarded-host",
        "x-forwarded-port",
        "x-real-ip",
      ]) {
        expect(
          response.headers.get(`x-middleware-request-${header}`),
        ).toBeNull();
      }
      expect(response.headers.get("x-middleware-request-cookie")).toBe(
        "XSRF-TOKEN=synthetic",
      );
      expect(response.headers.get("x-middleware-request-x-xsrf-token")).toBe(
        "synthetic",
      );
      expect(response.headers.get("Content-Security-Policy")).toBe(
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      );
    },
  );
});
