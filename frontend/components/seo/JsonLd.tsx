import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/seo";

export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // Serialized JSON escapes < so content cannot close this script element.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized and HTML-escaped by serializeJsonLd.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
