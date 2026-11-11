"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SavedResourceCard } from "@/components/resources/SavedResourceCard";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonStyles } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { resourceApi } from "@/lib/api";
import type { LoadState } from "@/lib/load-state";
import type { ResourceCategory, SavedResourceResponse } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

function SavedContent() {
  const [load, setLoad] = useState<LoadState<SavedResourceResponse[]>>({
    status: "loading",
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const resources = load.status === "success" ? load.data : [];
  const isLoading = load.status === "loading";
  const error = load.status === "error" ? load.message : null;
  const [filterCategory, setFilterCategory] = useState<ResourceCategory | "">(
    "",
  );

  const loadSaved = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoad({ status: "loading" });
    try {
      const data = await resourceApi.getSaved(controller.signal);
      if (!controller.signal.aborted) setLoad({ status: "success", data });
    } catch (cause) {
      if (!controller.signal.aborted)
        setLoad({
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

  function handleRemoved(id: string) {
    const focusedCard = document.activeElement?.closest("[data-resource-id]");
    if (focusedCard?.getAttribute("data-resource-id") === id)
      headingRef.current?.focus();
    setLoad((previous) =>
      previous.status === "success"
        ? { ...previous, data: previous.data.filter((item) => item.id !== id) }
        : previous,
    );
  }

  function handleUpdated(updated: SavedResourceResponse) {
    setLoad((previous) =>
      previous.status === "success"
        ? {
            ...previous,
            data: previous.data.map((item) =>
              item.id === updated.id ? updated : item,
            ),
          }
        : previous,
    );
  }

  const categories = Array.from(
    new Set(resources.map((r) => r.category)),
  ) as ResourceCategory[];

  // If the last item in a selected category disappears, show All immediately.
  const activeCategory = categories.some(
    (category) => category === filterCategory,
  )
    ? filterCategory
    : "";
  const filtered = activeCategory
    ? resources.filter((item) => item.category === activeCategory)
    : resources;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold text-slate-900"
          >
            Saved Resources
          </h1>
          <p className="text-slate-600 mt-1">
            {isLoading
              ? "Loading…"
              : error
                ? "Saved resources are unavailable."
                : `${resources.length} saved resource${resources.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/resources"
          className={buttonStyles({ variant: "secondary", size: "sm" })}
        >
          + Find More
        </Link>
      </div>

      <output className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading
          ? "Loading saved resources."
          : error
            ? ""
            : `Showing ${filtered.length} of ${resources.length} saved resources${activeCategory ? ` in ${CATEGORY_LABELS[activeCategory]}` : ""}.`}
      </output>
      {isLoading && (
        <LoadingSpinner
          announce={false}
          message="Loading your saved resources…"
        />
      )}

      {error && !isLoading && (
        <div>
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

      {/* Empty state */}
      {load.status === "success" && resources.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-5">📌</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            No saved resources yet
          </h2>
          <p className="text-slate-600 max-w-sm mx-auto mb-6">
            Search for VA facilities and services, then save the ones that are
            relevant to you.
          </p>
          <Link href="/resources" className={buttonStyles({})}>
            Search Resources
          </Link>
        </div>
      )}

      {/* Category filter tabs */}
      {!isLoading && resources.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              aria-pressed={activeCategory === ""}
              onClick={() => setFilterCategory("")}
              className={[
                "min-h-11 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeCategory === ""
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
                  aria-pressed={activeCategory === cat}
                  onClick={() =>
                    setFilterCategory(cat === activeCategory ? "" : cat)
                  }
                  className={[
                    "min-h-11 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    activeCategory === cat
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
