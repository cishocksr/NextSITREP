"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, buttonStyles } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { BRANCH_LABELS } from "@/lib/types";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/resources", label: "Find Resources" },
  { href: "/saved", label: "Saved" },
];

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
          {/* Logo */}
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="text-xl" aria-hidden="true">
              🇺🇸
            </span>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Veteran <span className="text-blue-600">FOB</span>
            </span>
          </Link>

          {/* Nav links (authenticated) */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={[
                    "inline-flex min-h-11 items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {isAuthenticated && user ? (
              <>
                <div className="hidden md:block max-w-40 break-words text-right">
                  <p className="text-sm font-medium text-slate-900 leading-none">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {BRANCH_LABELS[user.branchOfService]}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonStyles({ variant: "ghost", size: "sm" })}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className={buttonStyles({ variant: "primary", size: "sm" })}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav links */}
        {isAuthenticated && (
          <div className="flex flex-wrap sm:hidden gap-1 pb-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={[
                  "inline-flex min-h-11 items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
                ].join(" ")}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
