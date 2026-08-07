"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ResourceCategory, ResourceSearchParams } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

interface ResourceFiltersProps {
  defaultZip?: string;
  defaultCategory?: ResourceCategory | "";
  defaultKeyword?: string;
  defaultRadius?: number;
  onSearch: (params: ResourceSearchParams) => void;
  isLoading?: boolean;
}

const categoryOptions = [
  ...(Object.keys(CATEGORY_LABELS) as ResourceCategory[]).map((key) => ({
    value: key,
    label: CATEGORY_LABELS[key],
  })),
];

const radiusOptions = [
  { value: "10", label: "10 miles" },
  { value: "25", label: "25 miles" },
  { value: "50", label: "50 miles" },
  { value: "100", label: "100 miles" },
];

export function ResourceFilters({
  defaultZip = "",
  defaultCategory = "",
  defaultKeyword = "",
  defaultRadius = 25,
  onSearch,
  isLoading = false,
}: ResourceFiltersProps) {
  const [zipCode, setZipCode] = useState(defaultZip);
  const [category, setCategory] = useState<ResourceCategory | "">(
    defaultCategory,
  );
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [radius, setRadius] = useState(String(defaultRadius));

  useEffect(() => {
    setZipCode(defaultZip);
  }, [defaultZip]);

  useEffect(() => {
    setCategory(defaultCategory);
  }, [defaultCategory]);

  useEffect(() => {
    setKeyword(defaultKeyword);
  }, [defaultKeyword]);

  useEffect(() => {
    setRadius(String(defaultRadius));
  }, [defaultRadius]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!zipCode || zipCode.length !== 5) return;
    onSearch({
      zipCode,
      category: category || undefined,
      keyword: keyword || undefined,
      radius: Number(radius),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <Input
          label="Zip code"
          required
          maxLength={5}
          pattern="[0-9]{5}"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="e.g. 90210"
          className="xl:col-span-1"
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
          placeholder="e.g. mental health"
        />

        <Select
          label="Radius"
          options={radiusOptions}
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
        />

        <div className="flex items-end xl:col-span-1">
          <Button type="submit" isLoading={isLoading} className="w-full">
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
