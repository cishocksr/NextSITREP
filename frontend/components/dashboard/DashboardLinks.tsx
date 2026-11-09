import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/types";
import { type BranchTheme, quickActions, searchPaths } from "./config";
export function MissionPaths({ branchTheme }: { branchTheme: BranchTheme }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">Mission paths</h2>
        <p className="mt-1 text-sm text-slate-600">
          Open common searches with the category already selected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {searchPaths.map((path) => (
          <Link
            key={path.category}
            href={path.href}
            className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-slate-50"
          >
            <span
              className={[
                "flex h-11 w-11 items-center justify-center rounded-md text-sm font-bold",
                branchTheme.crest,
              ].join(" ")}
              aria-hidden="true"
            >
              {path.marker}
            </span>
            <span className="min-w-0">
              <span className="text-xs font-semibold text-slate-600">
                {CATEGORY_LABELS[path.category]}
              </span>
              <span className="mt-1 block text-sm font-semibold text-slate-900">
                {path.title}
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">
                {path.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
export function QuickActions() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Quick actions</h2>
      <div className="mt-4 space-y-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="block rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-slate-50"
          >
            <p className="text-sm font-semibold text-slate-900">
              {action.label}
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {action.detail}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
