"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceFilters } from "@/components/resources/ResourceFilters";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { resourceApi } from "@/lib/api";
import {
  normalizeSearch,
  readSearchQuery,
  type SubmittedSearch,
  searchQuery,
} from "@/lib/search";
import type { ResourceSearchParams, ResourceSearchResult } from "@/lib/types";

type SearchState =
  | { status: "idle" }
  | { status: "loading"; key: string }
  | { status: "error"; key: string; message: string }
  | {
      status: "success";
      key: string;
      params: SubmittedSearch;
      results: ResourceSearchResult[];
    };

function ResourcesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const query = useSearchParams().toString();
  const parsed = readSearchQuery(query, user?.zipCode);
  const key = parsed.key;
  const requestParams = useMemo(
    () => (key ? readSearchQuery(key).params : null),
    [key],
  );
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    if (key && key !== query)
      router.replace(`/resources?${key}`, { scroll: false });
  }, [key, query, router]);

  const runSearch = useCallback(
    async (params: SubmittedSearch, requestKey: string) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setSearch({ status: "loading", key: requestKey });
      try {
        const results = await resourceApi.search(params, controller.signal);
        if (!controller.signal.aborted)
          setSearch({ status: "success", key: requestKey, params, results });
      } catch (error) {
        if (!controller.signal.aborted)
          setSearch({
            status: "error",
            key: requestKey,
            message:
              error instanceof Error
                ? error.message
                : "Search failed. Please try again.",
          });
      }
    },
    [],
  );

  useEffect(() => {
    if (requestParams && key) void runSearch(requestParams, key);
    return () => {
      request.current?.abort();
    };
  }, [requestParams, key, runSearch]);

  const handleSearch = useCallback(
    (params: ResourceSearchParams) => {
      const submitted = normalizeSearch(params);
      const nextKey = searchQuery(submitted);
      if (nextKey === key) void runSearch(submitted, nextKey);
      else router.push(`/resources?${nextKey}`, { scroll: false });
    },
    [key, router, runSearch],
  );

  const snapshot =
    search.status === "success" && search.key === key ? search : null;
  const results = snapshot?.results ?? null;
  const isLoading =
    key !== null &&
    (search.status === "idle" ||
      search.key !== key ||
      search.status === "loading");
  const error =
    parsed.error ??
    (search.status === "error" && search.key === key ? search.message : null);
  return (
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
          key={key ?? query}
          defaultZip={parsed.defaults.zipCode}
          defaultCategory={parsed.defaults.category}
          defaultKeyword={parsed.defaults.keyword}
          defaultRadius={parsed.defaults.radius}
          onSearch={handleSearch}
          isLoading={isLoading}
        />
      </div>

      {/* Results */}
      {isLoading && (
        <LoadingSpinner message="Searching for resources near you..." />
      )}

      {error && !isLoading && (
        <div>
          <Alert
            variant="error"
            title={
              requestParams
                ? `Search near ${requestParams.zipCode} failed`
                : "Review your search filters"
            }
            message={error}
          />
          {requestParams && (
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => {
                if (requestParams && key) void runSearch(requestParams, key);
              }}
            >
              Retry search
            </Button>
          )}
        </div>
      )}

      {!isLoading && results !== null && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {results.length === 0
                ? "No resources found for your search."
                : `Found ${results.length} resource${results.length !== 1 ? "s" : ""}`}{" "}
              {snapshot && `near ${snapshot.params.zipCode}`}
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
                  onSaved={(saved) =>
                    setSearch((previous) =>
                      previous.status === "success" && previous.key === key
                        ? {
                            ...previous,
                            results: previous.results.map((item) =>
                              item.sourceApi === saved.sourceApi &&
                              item.externalId === saved.externalId
                                ? saved
                                : item,
                            ),
                          }
                        : previous,
                    )
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state before first search */}
      {!parsed.hasIntent && !isLoading && results === null && !error && (
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
  );
}

export default function ResourcesPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingSpinner size="lg" message="Loading..." />}>
        <ResourcesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
