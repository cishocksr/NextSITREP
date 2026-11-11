import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { buttonStyles } from "@/components/ui/Button";
import { findGuide, GUIDE_REVIEWED } from "@/lib/resource-guides";
import { pageMetadata, siteSettings } from "@/lib/seo";

type Props = { params: Promise<{ topic: string }> };
export async function generateMetadata({ params }: Props) {
  const guide = findGuide((await params).topic);
  if (!guide) notFound();
  return pageMetadata(
    guide.title,
    guide.description,
    `/resources/${guide.slug}`,
  );
}

export default async function GuidePage({ params }: Props) {
  const guide = findGuide((await params).topic);
  if (!guide) notFound();
  const { origin } = siteSettings();
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Resource guides", path: "/guides" },
    { name: guide.title, path: `/resources/${guide.slug}` },
  ];
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: new URL(item.path, origin).href,
          })),
        }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
          {breadcrumbs.map((item, index) => (
            <li key={item.path}>
              {index > 0 && (
                <span aria-hidden="true" className="mr-3 text-slate-500">
                  /
                </span>
              )}
              <Link
                href={item.path}
                aria-current={index === 2 ? "page" : undefined}
                className="text-blue-700 underline"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="mt-8 text-4xl font-bold text-slate-900">{guide.title}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-700">
        {guide.introduction}
      </p>
      <p className="mt-4 text-sm text-slate-600">
        Sources reviewed {GUIDE_REVIEWED}. Programs and availability can change;
        verify details with the provider.
      </p>
      {guide.sections.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="text-2xl font-semibold text-slate-900">
            {section.title}
          </h2>
          <p className="mt-3 leading-8 text-slate-700">{section.body}</p>
          {section.steps && (
            <ul className="mt-3 list-disc space-y-2 pl-6 leading-7 text-slate-700">
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-900">
          Official resources
        </h2>
        <ul className="mt-4 space-y-5">
          {guide.sources.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                className="font-semibold text-blue-700 underline"
              >
                {source.label}
              </a>
              <p className="mt-1 leading-7 text-slate-600">{source.detail}</p>
            </li>
          ))}
        </ul>
      </section>
      {guide.category && (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-slate-900">
            Find a nearby location
          </h2>
          <p className="mb-4 mt-3 leading-7 text-slate-700">
            A free account is required for NextSITREP’s ZIP-based facility
            search and saved notes. Results may be limited and do not confirm
            eligibility, available services, or costs.
          </p>
          <Link
            href={`/resources?category=${guide.category}`}
            className={buttonStyles()}
          >
            {guide.searchLabel} (sign in required)
          </Link>
        </section>
      )}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-slate-900">
          Related guides
        </h2>
        <ul className="mt-3 space-y-3">
          {guide.related.map((slug) => (
            <li key={slug}>
              <Link
                className="text-blue-700 underline"
                href={`/resources/${slug}`}
              >
                {findGuide(slug)?.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-10 border-t border-slate-200 pt-6 text-sm leading-7 text-slate-600">
        NextSITREP is an independent informational platform, not a VA service or
        professional adviser. Platform access is free; provider eligibility,
        service areas, availability, and costs vary.{" "}
        <Link href="/disclaimer" className="text-blue-700 underline">
          Read the disclaimer
        </Link>
        .
      </p>
    </div>
  );
}
