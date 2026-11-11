import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { proxy } from "@/proxy";
import { PUBLIC_GUIDE_PATHS } from "./resource-guides";
import {
  organizationGraph,
  pageMetadata,
  serializeJsonLd,
  siteSettings,
} from "./seo";

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://nextsitrep.org");
  vi.stubEnv("SITE_INDEXING_ENABLED", "false");
  vi.stubEnv("HTTPS_DEPLOYMENT", "true");
  vi.stubEnv("NODE_ENV", "production");
});

describe("public launch indexing boundary", () => {
  it("keeps a production-like staging build out of the sitemap and index by default", () => {
    expect(siteSettings().indexing).toBe(false);
    expect(sitemap()).toEqual([]);
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(
      proxy(new NextRequest("https://nextsitrep.org/")).headers.get(
        "X-Robots-Tag",
      ),
    ).toContain("noindex");
  });

  it("publishes only curated public canonical URLs after explicit HTTPS production opt-in", () => {
    vi.stubEnv("SITE_INDEXING_ENABLED", "true");
    const urls = sitemap().map(({ url }) => url);
    expect(urls).toContain("https://nextsitrep.org/");
    expect(urls).toContain("https://nextsitrep.org/guides");
    for (const path of PUBLIC_GUIDE_PATHS)
      expect(urls).toContain(`https://nextsitrep.org${path}`);
    expect(urls).not.toContain("https://nextsitrep.org/resources");
    expect(urls.every((url) => !/[?#]/.test(url))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/api/" },
      sitemap: "https://nextsitrep.org/sitemap.xml",
    });
    expect(
      proxy(
        new NextRequest("https://nextsitrep.org/resources/healthcare"),
      ).headers.get("X-Robots-Tag"),
    ).toBeNull();
  });

  it.each([
    "/login",
    "/register",
    "/dashboard",
    "/saved",
    "/resources?zipCode=12345&keyword=private",
    "/api/v1/resources/saved",
    "/resources/not-a-guide",
  ])("keeps %s noindex after launch", (path) => {
    vi.stubEnv("SITE_INDEXING_ENABLED", "true");
    expect(
      proxy(new NextRequest(`https://nextsitrep.org${path}`)).headers.get(
        "X-Robots-Tag",
      ),
    ).toContain("noindex");
  });

  it("does not authorize indexing on a preview host or HTTP deployment", () => {
    vi.stubEnv("SITE_INDEXING_ENABLED", "true");
    expect(
      proxy(
        new NextRequest("https://preview.example.test/", {
          headers: { "x-forwarded-host": "nextsitrep.org" },
        }),
      ).headers.get("X-Robots-Tag"),
    ).toContain("noindex");
    vi.stubEnv("HTTPS_DEPLOYMENT", "false");
    expect(sitemap()).toEqual([]);
    vi.stubEnv("HTTPS_DEPLOYMENT", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(sitemap()).toEqual([]);
  });

  it.each([
    "https://user:secret@nextsitrep.org",
    "https://nextsitrep.org/path",
    "https://nextsitrep.org?secret=private",
    "http://nextsitrep.org",
    "https://nextsitrep.org/#fragment",
  ])("rejects invalid origin configuration %s", (origin) => {
    vi.stubEnv("SITE_URL", origin);
    expect(siteSettings).toThrow("SITE_URL must be an HTTPS origin");
  });

  it("rejects accidental opt-in and unapproved canonical hosts", () => {
    vi.stubEnv("SITE_INDEXING_ENABLED", "yes");
    expect(siteSettings).toThrow("SITE_INDEXING_ENABLED must be true or false");
    vi.stubEnv("SITE_INDEXING_ENABLED", "true");
    vi.stubEnv("SITE_URL", "https://nextsitrep.com");
    expect(siteSettings).toThrow("canonical origin");
  });
});

describe("metadata and structured data", () => {
  it("uses route-specific canonical/social URLs and no canonical for private pages", () => {
    vi.stubEnv("SITE_INDEXING_ENABLED", "true");
    const page = pageMetadata("Privacy Policy", "Privacy details", "/privacy");
    expect(page.alternates?.canonical).toBe("https://nextsitrep.org/privacy");
    expect(page.openGraph).toMatchObject({
      url: "https://nextsitrep.org/privacy",
      siteName: "NextSITREP",
      description: "Privacy details",
    });
    expect(pageMetadata("Saved", "Your private notes").robots).toMatchObject({
      index: false,
    });
    expect(
      pageMetadata("Saved", "Your private notes").alternates,
    ).toBeUndefined();
  });

  it("serializes JSON-LD without allowing script termination and retains valid JSON", () => {
    const payload = {
      name: '</script><script src="https://attacker.test/">',
      value: "< > &",
    };
    const json = serializeJsonLd(payload);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual(payload);
    const graph = organizationGraph()["@graph"];
    expect(graph.map((entry) => entry["@type"])).toEqual([
      "Organization",
      "WebSite",
    ]);
    expect(JSON.stringify(graph)).not.toMatch(
      /SearchAction|aggregateRating|telephone|sameAs/,
    );
  });
});
