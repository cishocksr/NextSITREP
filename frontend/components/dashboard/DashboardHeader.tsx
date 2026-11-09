import type { AuthResponse } from "@/lib/types";
import { BRANCH_LABELS } from "@/lib/types";
import type { BranchTheme } from "./config";
export function DashboardHeader({
  user,
  branchTheme,
  savedCount,
}: {
  user: Pick<AuthResponse, "firstName" | "branchOfService" | "zipCode"> | null;
  branchTheme: BranchTheme;
  savedCount: number | string;
}) {
  return (
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
              {user ? BRANCH_LABELS[user.branchOfService] : "Veteran"} command
              center
            </p>
            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              {branchTheme.motto} for benefits, healthcare, housing, education,
              and anything you have already saved.
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
            <p className="mt-1 text-2xl font-bold">{savedCount}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
