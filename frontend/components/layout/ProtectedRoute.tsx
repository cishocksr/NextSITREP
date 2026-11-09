"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LoadingSpinner size="lg" message="Loading..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Fragment key={user?.userId}>{children}</Fragment>;
}
