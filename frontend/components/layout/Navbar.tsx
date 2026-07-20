"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { BRANCH_LABELS } from "@/lib/types";

const navLinks = [
  { href: "/home", label: "Home" },
  { href: "/resources", label: "Find Resources" },
  { href: "/saved", label: "Saved" },
];

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href={isAuthenticated ? "/home" : "/"}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="text-xl" aria-hidden="true">
              🇺🇸
            </span>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Veterans<span className="text-blue-600">Connect</span>
            </span>
          </Link>

          {/* Nav links (authenticated) */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
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
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-slate-900 leading-none">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {BRANCH_LABELS[user.branchOfService]}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav links */}
        {isAuthenticated && (
          <div className="flex sm:hidden gap-1 pb-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
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
