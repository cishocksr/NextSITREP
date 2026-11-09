"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SavedResourceCard } from "@/components/resources/SavedResourceCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { resourceApi } from "@/lib/api";
import type { ResourceCategory, SavedResourceResponse } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

function SavedContent() {
  const [resources, setResources] = useState<SavedResourceResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<ResourceCategory | "">(
    "",
  );

  useEffect(() => {
    async function load() {
      try {
        const data = await resourceApi.getSaved();
        setResources(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load saved resources.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function handleRemoved(id: string) {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  function handleUpdated(updated: SavedResourceResponse) {
    setResources((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
  }

  const categories = Array.from(
    new Set(resources.map((r) => r.category)),
  ) as ResourceCategory[];

  const filtered = filterCategory
    ? resources.filter((r) => r.category === filterCategory)
    : resources;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Resources</h1>
          <p className="text-slate-500 mt-1">
            {isLoading
              ? "Loading…"
              : `${resources.length} saved resource${resources.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/resources">
          <Button variant="secondary" size="sm">
            + Find More
          </Button>
        </Link>
      </div>

      {isLoading && <LoadingSpinner message="Loading your saved resources…" />}

      {error && !isLoading && (
        <Alert
          variant="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Empty state */}
      {!isLoading && !error && resources.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-5">📌</div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            No saved resources yet
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">
            Search for VA facilities and services, then save the ones that are
            relevant to you.
          </p>
          <Link href="/resources">
            <Button>Search Resources</Button>
          </Link>
        </div>
      )}

      {/* Category filter tabs */}
      {!isLoading && resources.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setFilterCategory("")}
              className={[
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                filterCategory === ""
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              All ({resources.length})
            </button>
            {categories.map((cat) => {
              const count = resources.filter((r) => r.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setFilterCategory(cat === filterCategory ? "" : cat)
                  }
                  className={[
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    filterCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {CATEGORY_LABELS[cat]} ({count})
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <SavedResourceCard
                key={r.id}
                resource={r}
                onRemoved={handleRemoved}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SavedPage() {
  return (
    <ProtectedRoute>
      <SavedContent />
    </ProtectedRoute>
  );
}
