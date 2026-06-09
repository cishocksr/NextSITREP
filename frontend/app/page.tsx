import Link from "next/link";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: "🏥",
    title: "Healthcare",
    description:
      "Locate VA medical centers, community clinics, and vet centers near you.",
  },
  {
    icon: "🎓",
    title: "Education",
    description:
      "Discover GI Bill benefits, vocational training, and education resources.",
  },
  {
    icon: "💰",
    title: "Financial Assistance",
    description:
      "Find disability compensation, pension programs, and emergency funds.",
  },
  {
    icon: "🏠",
    title: "Housing",
    description:
      "Access VA home loans, homeless prevention services, and transitional housing.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
          <div className="absolute top-10 left-1/4 text-9xl">⭐</div>
          <div className="absolute bottom-10 right-1/4 text-9xl">⭐</div>
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-800/50 px-4 py-1.5 text-sm font-medium text-blue-200 ring-1 ring-blue-700/50">
            <span>🇺🇸</span>
            <span>Built for those who served</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Find Veterans <span className="text-blue-400">Resources</span> Near
            You
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-300 mb-10">
            VeteransConnect helps you quickly discover healthcare, benefits,
            education, and housing resources from the VA and other trusted
            providers — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="primary" className="w-full sm:w-auto">
                Create Free Account
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="heroSecondary"
                className="w-full sm:w-auto"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Everything You Need, In One Place
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Search by zip code and instantly see VA facilities and resources
            near you, then save the ones that matter.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
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
                desc: "Filter by category, keyword, or distance to find what you need.",
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
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          Ready to find your benefits?
        </h2>
        <p className="text-slate-500 mb-8">
          It&apos;s free. No spam. Just resources for veterans, by veterans.
        </p>
        <Link href="/register">
          <Button size="lg">Get Started — It&apos;s Free</Button>
        </Link>
      </section>
    </div>
  );
}
