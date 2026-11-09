"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export function SessionNotice() {
  const { isSigningOut, sessionIssue, logout, retrySession } = useAuth();
  if (isSigningOut)
    return (
      <output className="mx-auto w-full max-w-7xl px-4 py-3 text-sm text-slate-700">
        Signing out…
      </output>
    );
  if (!sessionIssue) return null;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-3">
      <Alert variant="error" message={sessionIssue.message} />
      <Button
        type="button"
        variant="secondary"
        className="mt-2"
        onClick={() => {
          void (sessionIssue.kind === "logout" ? logout() : retrySession());
        }}
      >
        {sessionIssue.kind === "logout"
          ? "Retry sign out"
          : "Retry session check"}
      </Button>
    </div>
  );
}
