import type { MetadataRoute } from "next";
import { siteSettings } from "@/lib/seo";

export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const { origin, indexing } = siteSettings();
  return indexing
    ? {
        rules: { userAgent: "*", allow: "/", disallow: "/api/" },
        sitemap: `${origin}/sitemap.xml`,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
