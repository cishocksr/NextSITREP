"use client";

import type { ErrorInfo } from "next/error";
import { RouteError } from "@/components/layout/RouteError";

export default function DashboardError({ retry }: ErrorInfo) {
  return <RouteError heading="This workspace is unavailable" retry={retry} />;
}
