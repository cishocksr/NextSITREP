import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { LoadState } from "@/lib/load-state";
import type { ResourceCategory, SavedResourceResponse } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

function formatSavedDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function summarizeSaved(load: LoadState<SavedResourceResponse[]>) {
  const savedResources = load.status === "success" ? load.data : [];
  const counts = new Map<ResourceCategory, number>();
  for (const resource of savedResources) {
    counts.set(resource.category, (counts.get(resource.category) ?? 0) + 1);
  }
  const categoryCounts = Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const recentSaved = [...savedResources]
    .sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    )
    .slice(0, 3);

  const topCategory = categoryCounts[0];

  return {
    savedResources,
    categoryCounts,
    recentSaved,
    topCategory,
    isLoadingSaved: load.status === "loading",
    error: load.status === "error" ? load.message : null,
  };
}
type Summary = ReturnType<typeof summarizeSaved>;
export function SavedStats({ summary }: { summary: Summary }) {
  const {
    savedResources,
    categoryCounts,
    recentSaved,
    topCategory,
    isLoadingSaved,
    error,
  } = summary;
  return (
    <section className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-600">Saved resources</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">
          {isLoadingSaved ? "-" : error ? "Unavailable" : savedResources.length}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Latest saves (up to 3)
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">
          {isLoadingSaved ? "-" : error ? "Unavailable" : recentSaved.length}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-600">Top category</p>
        <p className="mt-2 break-words text-2xl font-bold text-slate-900">
          {isLoadingSaved
            ? "-"
            : error
              ? "Unavailable"
              : topCategory
                ? CATEGORY_LABELS[topCategory.category]
                : "None"}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-600">Saved categories</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">
          {isLoadingSaved ? "-" : error ? "Unavailable" : categoryCounts.length}
        </p>
      </div>
    </section>
  );
}
export function RecentSaved({ summary }: { summary: Summary }) {
  const { recentSaved, isLoadingSaved, error } = summary;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Continue where you left off
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Your latest saved resources.
          </p>
        </div>
        <Link
          href="/saved"
          className={buttonStyles({ variant: "ghost", size: "sm" })}
        >
          Open
        </Link>
      </div>

      {isLoadingSaved ? (
        <div className="mt-5">
          <LoadingSpinner announce={false} size="sm" message="Loading..." />
        </div>
      ) : error ? (
        <p className="mt-5 text-sm text-slate-700">
          Saved resources are unavailable. Retry loading them to see your latest
          saves.
        </p>
      ) : recentSaved.length === 0 ? (
        <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-800">
            Nothing saved yet
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Search resources and save the ones you want to revisit.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {recentSaved.map((resource) => (
            <div
              key={resource.id}
              className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0"
            >
              <p className="break-words text-sm font-semibold text-slate-900">
                {resource.name}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600">
                <span>{CATEGORY_LABELS[resource.category]}</span>
                <span>{formatSavedDate(resource.savedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
