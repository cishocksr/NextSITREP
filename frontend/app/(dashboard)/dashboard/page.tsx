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

const searchPaths: Array<{
  category: ResourceCategory;
  title: string;
  description: string;
  href: string;
}> = [
  {
    category: "HEALTHCARE",
    title: "Healthcare and mental health",
    description: "VA clinics, medical centers, counseling, and urgent support.",
    href: "/resources?category=HEALTHCARE",
  },
  {
    category: "BENEFITS",
    title: "Benefits and claims",
    description: "Compensation, pension, claim help, and service offices.",
    href: "/resources?category=BENEFITS",
  },
  {
    category: "HOUSING",
    title: "Housing support",
    description: "Home loan help, transitional housing, and shelter services.",
    href: "/resources?category=HOUSING",
  },
  {
    category: "EDUCATION",
    title: "Education and training",
    description:
      "GI Bill guidance, certification, schools, and career training.",
    href: "/resources?category=EDUCATION",
  },
];

const quickActions = [
  {
    label: "Start a broad search",
    detail: "Use your profile zip code and all categories.",
    href: "/resources",
  },
  {
    label: "Find nearby vet centers",
    detail: "Jump straight to in-person community support.",
    href: "/resources?category=VET_CENTER",
  },
  {
    label: "Review saved resources",
    detail: "Open the resources and notes you have already kept.",
    href: "/saved",
  },
];

function formatSavedDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function DashboardPage() {
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

  const recentSaved = useMemo(
    () =>
      [...savedResources]
        .sort(
          (a, b) =>
            new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
        )
        .slice(0, 3),
    [savedResources],
  );

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-slate-200 pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                {user ? BRANCH_LABELS[user.branchOfService] : "Veteran"}{" "}
                dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ""}.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Choose where to begin, search resources near{" "}
                {user?.zipCode ?? "your location"}, or return to anything you
                saved during a previous visit.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/resources">
                <Button size="lg" className="w-full sm:w-auto">
                  Go to search
                </Button>
              </Link>
              <Link href="/saved">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Saved resources
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6">
            <Alert
              variant="error"
              message={error}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        <section className="grid gap-4 py-6 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Profile ZIP</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {user?.zipCode ?? "Not set"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Saved resources
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {isLoadingSaved ? "-" : savedResources.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Saved categories
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {isLoadingSaved ? "-" : categoryCounts.length}
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Choose a search path
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Start broad or open the search page with a category already
                selected.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {searchPaths.map((path) => (
                <Link
                  key={path.category}
                  href={path.href}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <p className="text-sm font-semibold text-blue-700">
                    {CATEGORY_LABELS[path.category]}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">
                    {path.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {path.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Quick actions
              </h2>
              <div className="mt-4 space-y-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="block rounded-md border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {action.label}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {action.detail}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Recently saved
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Your latest saved resources and notes.
                  </p>
                </div>
                <Link href="/saved">
                  <Button variant="ghost" size="sm">
                    Open
                  </Button>
                </Link>
              </div>

              {isLoadingSaved ? (
                <div className="mt-5">
                  <LoadingSpinner size="sm" message="Loading..." />
                </div>
              ) : recentSaved.length === 0 ? (
                <div className="mt-5 rounded-md bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800">
                    Nothing saved yet
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
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
      </main>
    </ProtectedRoute>
  );
}
