import type { MetadataRoute } from "next";
import { PUBLIC_GUIDE_PATHS } from "@/lib/resource-guides";
import { siteSettings } from "@/lib/seo";

export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  const { origin, indexing } = siteSettings();
  if (!indexing) return [];
  return [
    "/",
    "/guides",
    "/privacy",
    "/terms",
    "/disclaimer",
    ...PUBLIC_GUIDE_PATHS,
  ].map((path) => ({ url: new URL(path, origin).href }));
}
