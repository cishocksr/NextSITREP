import Link from "next/link";
import { resourceGuides } from "@/lib/resource-guides";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata() {
  return pageMetadata(
    "Veteran Resource Guides",
    "Explore official starting points for VA benefits, healthcare, counseling, housing, financial support, education, and employment.",
    "/guides",
  );
}

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold text-slate-900">
        Veteran resource guides
      </h1>
      <p className="mt-4 max-w-3xl text-lg text-slate-600">
        Find official starting points and practical questions to ask providers.
        These guides are free to read without an account. NextSITREP is
        independent and is not affiliated with the Department of Veterans
        Affairs.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {resourceGuides.map((guide) => (
          <article
            key={guide.slug}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-semibold">
              <Link
                className="text-blue-700 underline underline-offset-4"
                href={`/resources/${guide.slug}`}
              >
                {guide.title}
              </Link>
            </h2>
            <p className="mt-3 leading-7 text-slate-600">{guide.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
