"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { branchThemes } from "@/components/dashboard/config";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  MissionPaths,
  QuickActions,
} from "@/components/dashboard/DashboardLinks";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import {
  RecentSaved,
  SavedStats,
  summarizeSaved,
} from "@/components/dashboard/SavedSummary";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { resourceApi } from "@/lib/api";
import type { LoadState } from "@/lib/load-state";
import type { SavedResourceResponse } from "@/lib/types";

function DashboardContent() {
  const { user } = useAuth();
  const [savedLoad, setSavedLoad] = useState<
    LoadState<SavedResourceResponse[]>
  >({ status: "loading" });
  const request = useRef<AbortController | null>(null);
  const savedResources = savedLoad.status === "success" ? savedLoad.data : [];
  const isLoadingSaved = savedLoad.status === "loading";
  const error = savedLoad.status === "error" ? savedLoad.message : null;
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

  const summary = summarizeSaved(savedLoad);
  const branchTheme = branchThemes[user?.branchOfService ?? "ARMY"];
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
        <DashboardHeader
          user={user}
          branchTheme={branchTheme}
          savedCount={
            isLoadingSaved ? "-" : error ? "Unavailable" : savedResources.length
          }
        />
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
        <DashboardSearch profileZip={user?.zipCode} branchTheme={branchTheme} />
        <SavedStats summary={summary} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <MissionPaths branchTheme={branchTheme} />
          <aside className="min-w-0 space-y-6">
            <QuickActions />
            <RecentSaved summary={summary} />
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
