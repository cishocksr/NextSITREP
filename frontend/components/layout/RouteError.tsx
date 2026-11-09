"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button, buttonStyles } from "@/components/ui/Button";

export function RouteError({
  heading,
  retry,
}: {
  heading: string;
  retry: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <section className="mx-auto max-w-xl px-4 py-16">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-bold text-slate-900"
      >
        {heading}
      </h1>
      <p className="mt-3 text-slate-700">
        This page could not finish loading. Try again, or return to the home
        page.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={retry}>Try again</Button>
        <Link href="/" className={buttonStyles({ variant: "secondary" })}>
          Go to home page
        </Link>
      </div>
    </section>
  );
}
