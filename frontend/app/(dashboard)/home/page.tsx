"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { resourceApi } from "@/lib/api";
import type { ResourceCategory, SavedResourceResponse } from "@/lib/types";
import { BRANCH_LABELS, CATEGORY_LABELS } from "@/lib/types";

const categoryHighlights: Array<{
  category: ResourceCategory;
  description: string;
}> = [
  {
    category: "HEALTHCARE",
    description: "Find VA medical centers, clinics, and mental health support.",
  },
  {
    category: "BENEFITS",
    description: "Review compensation, pension, claims, and service offices.",
  },
  {
    category: "HOUSING",
    description:
      "Look for housing support, home loan help, and shelter options.",
  },
  {
    category: "EDUCATION",
    description:
      "Explore GI Bill, training, certification, and school resources.",
  },
];

function formatSavedDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function HomePage() {
  const { user } = useAuth();
  const [savedResources, setSavedResources] = useState<SavedResourceResponse[]>(
    [],
  );
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSavedResources() {
      try {
        const data = await resourceApi.getSaved();
        setSavedResources(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your saved resources.",
        );
      } finally {
        setIsLoadingSaved(false);
      }
    }

    loadSavedResources();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ResourceCategory, number>();
    for (const resource of savedResources) {
      counts.set(resource.category, (counts.get(resource.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [savedResources]);

  const recentSaved = [...savedResources]
    .sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
    )
    .slice(0, 3);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="mb-3 text-sm font-medium text-blue-700">
                {user ? BRANCH_LABELS[user.branchOfService] : "Veteran"}{" "}
                resources near {user?.zipCode ?? "you"}
              </p>
              <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ""}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Start from your zip code, return to saved resources, or jump
                into a focused category when you already know what kind of help
                you need.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/resources">
                  <Button size="lg" className="w-full sm:w-auto">
                    Search near {user?.zipCode ?? "me"}
                  </Button>
                </Link>
                <Link href="/saved">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    View saved resources
                  </Button>
                </Link>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-900 p-6 text-white sm:p-8 lg:border-l lg:border-t-0">
              <p className="text-sm font-medium text-blue-200">
                Your workspace
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-bold">{savedResources.length}</p>
                  <p className="mt-1 text-sm text-slate-300">Saved</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {categoryCounts.length || 0}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">Categories</p>
                </div>
                <div className="col-span-2 rounded-xl bg-white/10 p-4">
                  <p className="text-sm text-slate-300">Profile location</p>
                  <p className="mt-1 text-xl font-semibold">
                    {user?.zipCode ?? "Not set"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6">
            <Alert
              variant="error"
              message={error}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Start a focused search
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Common paths based on the resource categories in the app.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {categoryHighlights.map((item) => (
                <Link
                  key={item.category}
                  href="/resources"
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <p className="text-sm font-medium text-blue-700">
                    {CATEGORY_LABELS[item.category]}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">
                    Search {CATEGORY_LABELS[item.category].toLowerCase()}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Saved snapshot
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {isLoadingSaved
                      ? "Loading saved resources"
                      : `${savedResources.length} total saved`}
                  </p>
                </div>
                <Link href="/saved">
                  <Button variant="ghost" size="sm">
                    Open
                  </Button>
                </Link>
              </div>

              {isLoadingSaved ? (
                <LoadingSpinner size="sm" message="Loading..." />
              ) : savedResources.length === 0 ? (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800">
                    Nothing saved yet
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Save useful facilities or programs while searching so they
                    are easy to find again.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryCounts.slice(0, 4).map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-slate-600">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Recently saved
              </h2>
              {isLoadingSaved ? (
                <div className="mt-4">
                  <LoadingSpinner size="sm" message="Loading..." />
                </div>
              ) : recentSaved.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Your most recent saved resources will appear here.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {recentSaved.map((resource) => (
                    <div
                      key={resource.id}
                      className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0"
                    >
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                        {resource.name}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>{CATEGORY_LABELS[resource.category]}</span>
                        <span>{formatSavedDate(resource.savedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </ProtectedRoute>
  );
}
