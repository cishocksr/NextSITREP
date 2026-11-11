import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { buttonStyles } from "@/components/ui/Button";
import { resourceGuides } from "@/lib/resource-guides";
import { organizationGraph, pageMetadata, SITE_DESCRIPTION } from "@/lib/seo";

const features = [
  {
    icon: "🏥",
    title: "VA healthcare facilities",
    description:
      "Find VA medical centers and clinics, then confirm services directly with the location.",
    href: "/resources/healthcare",
  },
  {
    icon: "📋",
    title: "VA benefits offices",
    description:
      "Locate benefits offices and official starting points for disability, education, housing, and financial questions.",
    href: "/resources/benefits",
  },
  {
    icon: "🤝",
    title: "Vet Centers",
    description:
      "Locate nearby Vet Centers and ask the provider about counseling services and eligibility.",
    href: "/resources/mental-health",
  },
];

export function generateMetadata() {
  return pageMetadata(
    "Find VA Facilities and Veteran Resources Near You",
    SITE_DESCRIPTION,
    "/",
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <JsonLd data={organizationGraph()} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10 pointer-events-none select-none"
        >
          <div className="absolute top-10 left-1/4 text-9xl">⭐</div>
          <div className="absolute bottom-10 right-1/4 text-9xl">⭐</div>
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-800/50 px-4 py-1.5 text-sm font-medium text-blue-200 ring-1 ring-blue-700/50">
            <span aria-hidden="true">🇺🇸</span>
            <span>Built for those who served</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Find VA Facilities and Veteran{" "}
            <span className="text-blue-400">Resources</span> Near You
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-300 mb-10">
            NextSITREP helps U.S. military veterans find nearby VA healthcare
            facilities, benefits offices, and Vet Centers. Create a free account
            to save locations and personal notes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className={buttonStyles({
                variant: "primary",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className={buttonStyles({
                variant: "heroSecondary",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            What You Can Find
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            Search by U.S. ZIP code and distance to find VA facility listings.
            Availability and services must be verified with providers.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div aria-hidden="true" className="text-3xl mb-3">
                {f.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                <Link
                  href={f.href}
                  className="text-blue-700 underline underline-offset-4"
                >
                  {f.title}
                </Link>
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              How It Works
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              {
                step: "1",
                title: "Create your account",
                desc: "Register with your branch of service and zip code.",
              },
              {
                step: "2",
                title: "Search for resources",
                desc: "Filter facility listings by category, name or classification keyword, and distance.",
              },
              {
                step: "3",
                title: "Save & take notes",
                desc: "Bookmark resources and add personal notes for future reference.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-600 text-white text-lg font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-bold text-slate-900">
          Explore veteran resource guides
        </h2>
        <p className="mt-4 text-slate-600">
          Read official starting points and practical next steps without an
          account.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {resourceGuides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/resources/${guide.slug}`}
                className="font-semibold text-blue-700 underline underline-offset-4"
              >
                {guide.title}
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="mt-12 text-3xl font-bold text-slate-900">
          About NextSITREP
        </h2>
        <p className="mt-4 leading-7 text-slate-600">
          NextSITREP is an independent informational platform and is not
          affiliated with the U.S. Department of Veterans Affairs. Our current
          search uses the VA Facilities API. It does not cover all community
          organizations, grants, jobs, or available housing, and results may be
          limited.
        </p>
        <p className="mt-3 leading-7 text-slate-600">
          Education, housing, and financial-assistance filters locate VA
          benefits offices rather than individual programs. Contact providers to
          verify services, eligibility, costs, and geographic availability.{" "}
          <Link href="/disclaimer" className="text-blue-700 underline">
            Read our disclaimer
          </Link>
          .
        </p>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Ready to organize your resource search?
        </h2>
        <p className="text-slate-600 mb-8">
          NextSITREP accounts and public guides are free. Provider services may
          have costs or eligibility requirements; confirm directly before
          relying on a listing.
        </p>
        <Link href="/register" className={buttonStyles({ size: "lg" })}>
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
