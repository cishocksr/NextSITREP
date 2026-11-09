"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import { resourceApi } from "@/lib/api";
import type { LoadState } from "@/lib/load-state";
import { normalizeSearch, SEARCH_RADII, searchQuery } from "@/lib/search";
import type {
  BranchOfService,
  ResourceCategory,
  SavedResourceResponse,
} from "@/lib/types";
import { BRANCH_LABELS, CATEGORY_LABELS } from "@/lib/types";

const searchPaths: Array<{
  category: ResourceCategory;
  title: string;
  description: string;
  href: string;
  marker: string;
}> = [
  {
    category: "HEALTHCARE",
    title: "Healthcare and mental health",
    description: "VA clinics, counseling, urgent support.",
    href: "/resources?category=HEALTHCARE",
    marker: "HC",
  },
  {
    category: "BENEFITS",
    title: "Benefits and claims",
    description: "Compensation, pensions, claim help.",
    href: "/resources?category=BENEFITS",
    marker: "VA",
  },
  {
    category: "HOUSING",
    title: "Housing support",
    description: "Home loans, shelters, transition services.",
    href: "/resources?category=HOUSING",
    marker: "HS",
  },
  {
    category: "EDUCATION",
    title: "Education and training",
    description: "GI Bill, schools, certifications.",
    href: "/resources?category=EDUCATION",
    marker: "ED",
  },
];

const quickActions = [
  {
    label: "Broad resource search",
    detail: "Search every category near your profile ZIP.",
    href: "/resources",
  },
  {
    label: "Nearby vet centers",
    detail: "Jump to in-person community support.",
    href: "/resources?category=VET_CENTER",
  },
  {
    label: "Saved resources",
    detail: "Open your saved list and notes.",
    href: "/saved",
  },
];

const categoryOptions = [
  ...(Object.keys(CATEGORY_LABELS) as ResourceCategory[]).map((key) => ({
    value: key,
    label: CATEGORY_LABELS[key],
  })),
];

const radiusOptions = SEARCH_RADII.map((radius) => ({
  value: String(radius),
  label: `${radius} miles`,
}));

const branchThemes: Record<
  BranchOfService,
  {
    initials: string;
    motto: string;
    border: string;
    eyebrow: string;
    panel: string;
    crest: string;
    crestRing: string;
    button: string;
  }
> = {
  ARMY: {
    initials: "AR",
    motto: "Soldier-focused support",
    border: "border-emerald-700",
    eyebrow: "text-emerald-700",
    panel: "from-emerald-950 via-stone-900 to-zinc-900",
    crest: "bg-emerald-700 text-white",
    crestRing: "ring-amber-300/70",
    button: "bg-emerald-700 hover:bg-emerald-800",
  },
  NAVY: {
    initials: "NV",
    motto: "Fleet-ready resources",
    border: "border-blue-800",
    eyebrow: "text-blue-700",
    panel: "from-blue-950 via-slate-900 to-zinc-950",
    crest: "bg-blue-800 text-white",
    crestRing: "ring-yellow-300/80",
    button: "bg-blue-700 hover:bg-blue-800",
  },
  AIR_FORCE: {
    initials: "AF",
    motto: "Airman-centered guidance",
    border: "border-sky-700",
    eyebrow: "text-sky-700",
    panel: "from-sky-950 via-slate-900 to-zinc-950",
    crest: "bg-sky-700 text-white",
    crestRing: "ring-slate-200/80",
    button: "bg-sky-700 hover:bg-sky-800",
  },
  MARINE_CORPS: {
    initials: "MC",
    motto: "Marine-focused next steps",
    border: "border-red-800",
    eyebrow: "text-red-700",
    panel: "from-red-950 via-zinc-900 to-stone-950",
    crest: "bg-red-800 text-white",
    crestRing: "ring-yellow-300/80",
    button: "bg-red-700 hover:bg-red-800",
  },
  COAST_GUARD: {
    initials: "CG",
    motto: "Coast Guard resource watch",
    border: "border-orange-600",
    eyebrow: "text-orange-700",
    panel: "from-blue-950 via-slate-900 to-orange-950",
    crest: "bg-orange-700 text-white",
    crestRing: "ring-blue-200/80",
    button: "bg-orange-700 hover:bg-orange-800",
  },
  SPACE_FORCE: {
    initials: "SF",
    motto: "Guardian mission support",
    border: "border-indigo-700",
    eyebrow: "text-indigo-700",
    panel: "from-indigo-950 via-zinc-950 to-cyan-950",
    crest: "bg-indigo-700 text-white",
    crestRing: "ring-cyan-200/80",
    button: "bg-indigo-700 hover:bg-indigo-800",
  },
};

function formatSavedDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [savedLoad, setSavedLoad] = useState<
    LoadState<SavedResourceResponse[]>
  >({ status: "loading" });
  const request = useRef<AbortController | null>(null);
  const savedResources = savedLoad.status === "success" ? savedLoad.data : [];
  const isLoadingSaved = savedLoad.status === "loading";
  const error = savedLoad.status === "error" ? savedLoad.message : null;
  const [searchError, setSearchError] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState("");
  const [category, setCategory] = useState<ResourceCategory | "">("");
  const [keyword, setKeyword] = useState("");
  const [radius, setRadius] = useState("25");

  const branchTheme = user
    ? branchThemes[user.branchOfService]
    : branchThemes.ARMY;

  useEffect(() => {
    if (user?.zipCode) {
      setZipCode(user.zipCode);
    }
  }, [user?.zipCode]);

  const loadSaved = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSavedLoad({ status: "loading" });
    try {
      const data = await resourceApi.getSaved(controller.signal);
      if (!controller.signal.aborted) setSavedLoad({ status: "success", data });
    } catch (cause) {
      if (!controller.signal.aborted)
        setSavedLoad({
          status: "error",
          message:
            cause instanceof Error
              ? cause.message
              : "Failed to load saved resources.",
        });
    }
  }, []);
  useEffect(() => {
    void loadSaved();
    return () => {
      request.current?.abort();
    };
  }, [loadSaved]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<ResourceCategory, number>();
    for (const resource of savedResources) {
      counts.set(resource.category, (counts.get(resource.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([savedCategory, count]) => ({ category: savedCategory, count }))
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

  const topCategory = categoryCounts[0];

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearchError(null);
    try {
      const params = normalizeSearch({ zipCode, category, keyword, radius });
      router.push(`/resources?${searchQuery(params)}`);
    } catch (cause) {
      setSearchError(
        cause instanceof Error ? cause.message : "Review your search filters.",
      );
    }
  }

  return (
    <div className="min-w-0 break-words min-h-[calc(100vh-4rem)] bg-slate-50">
      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoadingSaved
          ? "Loading saved resources."
          : error
            ? ""
            : `${savedResources.length} saved resources loaded.`}
      </output>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section
          className={[
            "overflow-hidden rounded-lg border bg-gradient-to-br text-white shadow-sm",
            branchTheme.border,
            branchTheme.panel,
          ].join(" ")}
        >
          <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-7">
            <div className="flex min-w-0 gap-4">
              <div
                className={[
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-xl font-bold ring-2",
                  branchTheme.crest,
                  branchTheme.crestRing,
                ].join(" ")}
                aria-hidden="true"
              >
                {branchTheme.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/75">
                  {user ? BRANCH_LABELS[user.branchOfService] : "Veteran"}{" "}
                  command center
                </p>
                <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                  Welcome back{user?.firstName ? `, ${user.firstName}` : ""}.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                  {branchTheme.motto} for benefits, healthcare, housing,
                  education, and anything you have already saved.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                <p className="text-white/85">Profile ZIP</p>
                <p className="mt-1 text-2xl font-bold">
                  {user?.zipCode ?? "Not set"}
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                <p className="text-white/85">Saved</p>
                <p className="mt-1 text-2xl font-bold">
                  {isLoadingSaved
                    ? "-"
                    : error
                      ? "Unavailable"
                      : savedResources.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5">
            <Alert variant="error" message={error} />
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => {
                void loadSaved();
              }}
            >
              Retry loading saved resources
            </Button>
          </div>
        )}

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className={["text-sm font-semibold", branchTheme.eyebrow].join(
                  " ",
                )}
              >
                Resource search
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Start with location, need, and range
              </h2>
            </div>
            <Link
              href="/resources"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              Advanced search
            </Link>
          </div>

          {searchError && (
            <div className="mt-4">
              <Alert variant="error" message={searchError} />
            </div>
          )}
          <form
            onSubmit={handleSearch}
            className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)_150px_130px]"
          >
            <Input
              label="ZIP"
              required
              maxLength={5}
              pattern="[0-9]{5}"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="12345"
            />
            <Select
              label="Category"
              options={categoryOptions}
              placeholder="All categories"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ResourceCategory | "")
              }
            />
            <Input
              label="Keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="mental health, claims, school"
            />
            <Select
              label="Radius"
              options={radiusOptions}
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                type="submit"
                className={[
                  "w-full border-transparent",
                  branchTheme.button,
                ].join(" ")}
              >
                Search
              </Button>
            </div>
          </form>
        </section>

        <section className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Saved resources
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {isLoadingSaved
                ? "-"
                : error
                  ? "Unavailable"
                  : savedResources.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Latest saves (up to 3)
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {isLoadingSaved
                ? "-"
                : error
                  ? "Unavailable"
                  : recentSaved.length}
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
            <p className="text-sm font-medium text-slate-600">
              Saved categories
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {isLoadingSaved
                ? "-"
                : error
                  ? "Unavailable"
                  : categoryCounts.length}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Mission paths
              </h2>
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

          <aside className="min-w-0 space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Quick actions
              </h2>
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
                  <LoadingSpinner
                    announce={false}
                    size="sm"
                    message="Loading..."
                  />
                </div>
              ) : error ? (
                <p className="mt-5 text-sm text-slate-700">
                  Saved resources are unavailable. Retry loading them to see
                  your latest saves.
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
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
