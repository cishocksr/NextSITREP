"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { normalizeSearch, searchQuery } from "@/lib/search";
import { categoryOptions, radiusOptions } from "@/lib/search-options";
import type { ResourceCategory } from "@/lib/types";
import type { BranchTheme } from "./config";

export function DashboardSearch({
  profileZip,
  branchTheme,
}: {
  profileZip?: string;
  branchTheme: BranchTheme;
}) {
  const router = useRouter();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState("");
  const [category, setCategory] = useState<ResourceCategory | "">("");
  const [keyword, setKeyword] = useState("");
  const [radius, setRadius] = useState("25");

  useEffect(() => {
    if (profileZip) {
      setZipCode(profileZip);
    }
  }, [profileZip]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearchError(null);
    try {
      const params = normalizeSearch({ zipCode, category, keyword, radius });
      router.push(`/resources?${searchQuery(params)}`);
    } catch (cause) {
      setSearchError(
        cause instanceof Error ? cause.message : "Review your search filters.",
      );
    }
  }

  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className={["text-sm font-semibold", branchTheme.eyebrow].join(" ")}
          >
            Resource search
          </p>
          <h2 className="text-xl font-bold text-slate-900">
            Start with location, need, and range
          </h2>
        </div>
        <Link
          href="/resources"
          className={buttonStyles({ variant: "ghost", size: "sm" })}
        >
          Advanced search
        </Link>
      </div>

      {searchError && (
        <div className="mt-4">
          <Alert variant="error" message={searchError} />
        </div>
      )}
      <form
        onSubmit={handleSearch}
        className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)_150px_130px]"
      >
        <Input
          label="ZIP"
          required
          maxLength={5}
          pattern="[0-9]{5}"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="12345"
        />
        <Select
          label="Category"
          options={categoryOptions}
          placeholder="All categories"
          value={category}
          onChange={(e) => setCategory(e.target.value as ResourceCategory | "")}
        />
        <Input
          label="Keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="mental health, claims, school"
        />
        <Select
          label="Radius"
          options={radiusOptions}
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
        />
        <div className="flex items-end">
          <Button
            type="submit"
            className={["w-full border-transparent", branchTheme.button].join(
              " ",
            )}
          >
            Search
          </Button>
        </div>
      </form>
    </section>
  );
}
