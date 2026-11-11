import type { Metadata } from "next";

export const BRAND = "NextSITREP";
export const SITE_DESCRIPTION =
  "Find nearby VA healthcare facilities, benefits offices, and Vet Centers. Create a free NextSITREP account to save locations and personal notes.";

// Server runtime configuration: a production build is also used for previews.
export function siteSettings() {
  const origin = new URL(process.env.SITE_URL ?? "https://nextsitrep.org");
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error(
      "SITE_URL must be an HTTPS origin without credentials, path, query, or fragment",
    );
  const flag = process.env.SITE_INDEXING_ENABLED ?? "false";
  if (flag !== "true" && flag !== "false")
    throw new Error("SITE_INDEXING_ENABLED must be true or false");
  if (flag === "true" && origin.origin !== "https://nextsitrep.org")
    throw new Error(
      "Public indexing requires the verified https://nextsitrep.org canonical origin",
    );
  return {
    origin: origin.origin,
    indexing:
      flag === "true" &&
      process.env.NODE_ENV === "production" &&
      process.env.HTTPS_DEPLOYMENT === "true",
  };
}

export function pageMetadata(
  title: string,
  description: string,
  path?: string,
): Metadata {
  const { origin, indexing } = siteSettings();
  const url = path ? new URL(path, origin).href : undefined;
  return {
    title: path === "/" ? { absolute: `${title} | ${BRAND}` } : title,
    description,
    alternates: url ? { canonical: url } : undefined,
    robots: { index: Boolean(path) && indexing, follow: true },
    openGraph: {
      type: "website",
      siteName: BRAND,
      locale: "en_US",
      title: `${title} | ${BRAND}`,
      description,
      url,
      images: [
        {
          url: `${origin}/nextsitrep-social.png`,
          width: 1200,
          height: 630,
          alt: "NextSITREP — Find VA facilities and veteran resources near you",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${BRAND}`,
      description,
      images: [
        {
          url: `${origin}/nextsitrep-social.png`,
          alt: "NextSITREP — Find VA facilities and veteran resources near you",
        },
      ],
    },
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function organizationGraph() {
  const { origin } = siteSettings();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: BRAND,
        url: origin,
        description:
          "An independent resource platform helping U.S. military veterans find nearby VA facilities and official resource information. Not affiliated with the Department of Veterans Affairs.",
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: BRAND,
        url: origin,
        inLanguage: "en-US",
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}
