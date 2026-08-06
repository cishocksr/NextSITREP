"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceFilters } from "@/components/resources/ResourceFilters";
import { Alert } from "@/components/ui/Alert";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { resourceApi } from "@/lib/api";
import type {
  ResourceCategory,
  ResourceSearchParams,
  ResourceSearchResult,
} from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

function ResourcesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const keywordParam = searchParams.get("keyword") ?? "";
  const radiusParam = Number(searchParams.get("radius") ?? "25");
  const zipCodeParam = searchParams.get("zipCode") ?? "";
  const defaultCategory =
    categoryParam && categoryParam in CATEGORY_LABELS
      ? (categoryParam as ResourceCategory)
      : "";
  const [results, setResults] = useState<ResourceSearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<ResourceSearchParams | null>(
    null,
  );

  async function handleSearch(params: ResourceSearchParams) {
    setIsLoading(true);
    setError(null);
    setLastSearch(params);
    try {
      const data = await resourceApi.search(params);
      setResults(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Search failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Find Resources</h1>
          <p className="text-slate-500 mt-1">
            Search VA facilities and services near you
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <ResourceFilters
            defaultZip={zipCodeParam || user?.zipCode || ""}
            defaultCategory={defaultCategory}
            defaultKeyword={keywordParam}
            defaultRadius={Number.isNaN(radiusParam) ? 25 : radiusParam}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>

        {/* Results */}
        {isLoading && (
          <LoadingSpinner message="Searching for resources near you..." />
        )}

        {error && !isLoading && (
          <Alert
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {!isLoading && results !== null && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {results.length === 0
                  ? "No resources found for your search."
                  : `Found ${results.length} resource${results.length !== 1 ? "s" : ""}`}{" "}
                {lastSearch?.zipCode && `near ${lastSearch.zipCode}`}
              </p>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">
                  No results found
                </h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  Try expanding your radius, removing filters, or searching a
                  different zip code.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((r) => (
                  <ResourceCard
                    key={`${r.sourceApi}-${r.externalId}`}
                    resource={r}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state before first search */}
        {!isLoading && results === null && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-5">🗺️</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              Ready to find resources?
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Enter your zip code above and search for nearby VA facilities,
              healthcare, benefits, and more.
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" message="Loading..." />}>
      <ResourcesContent />
    </Suspense>
  );
}
