"use client";

import type { ErrorInfo } from "next/error";
import { RouteError } from "@/components/layout/RouteError";

export default function PageError({ retry }: ErrorInfo) {
  return <RouteError heading="This page is unavailable" retry={retry} />;
}
