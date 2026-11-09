import Link from "next/link";

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-slate-800">Veteran FOB</p>
            <p className="mt-1 max-w-2xl leading-6">
              Resource data is informational and should be verified directly
              with official providers before making benefits, healthcare,
              housing, financial, or legal decisions.
            </p>
          </div>

          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-slate-600 hover:text-blue-700 hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Resource data powered by VA Facilities API.</span>
          <span>
            In an emergency, call 911. For crisis support, call 988 and press 1.
          </span>
        </div>
      </div>
    </footer>
  );
}
