import type { ResourceCategory, ResourceSearchParams } from "./types";
import { CATEGORY_LABELS } from "./types";

export const DEFAULT_SEARCH_RADIUS = 25;
export const SEARCH_RADII = [10, 25, 50, 100] as const;
export type SubmittedSearch = ResourceSearchParams & { radius: number };

interface SearchInput {
  zipCode: string;
  category?: string;
  keyword?: string;
  radius?: string | number;
}

function validRadius(value: string | number): boolean {
  if (typeof value === "string" && !/^[0-9]+$/.test(value.trim())) return false;
  const radius = Number(value);
  return Number.isInteger(radius) && radius >= 1 && radius <= 100;
}

/** One policy for form submissions, URL navigation and browser API calls. */
export function normalizeSearch(input: SearchInput): SubmittedSearch {
  const zipCode = input.zipCode.trim();
  if (!/^[0-9]{5}$/.test(zipCode))
    throw new Error("Enter a five-digit ZIP code.");
  const category = input.category || undefined;
  if (category && !Object.hasOwn(CATEGORY_LABELS, category)) {
    throw new Error("Choose a valid resource category.");
  }
  const radius = input.radius ?? DEFAULT_SEARCH_RADIUS;
  if (!validRadius(radius))
    throw new Error("Choose a whole-number radius between 1 and 100 miles.");
  return {
    zipCode,
    category: category as ResourceCategory | undefined,
    keyword: input.keyword?.trim() || undefined,
    radius: Number(radius),
  };
}

export function searchQuery(input: SearchInput): string {
  const params = normalizeSearch(input);
  const query = new URLSearchParams({ zipCode: params.zipCode });
  if (params.category) query.set("category", params.category);
  if (params.keyword) query.set("keyword", params.keyword);
  query.set("radius", String(params.radius));
  return query.toString();
}

export function readSearchQuery(query: string, profileZip = "") {
  const source = new URLSearchParams(query);
  const hasIntent = ["zipCode", "category", "keyword", "radius"].some((key) =>
    source.has(key),
  );
  const input = {
    zipCode: source.get("zipCode") ?? profileZip,
    category: source.get("category") ?? "",
    keyword: source.get("keyword") ?? "",
    radius: source.get("radius") ?? DEFAULT_SEARCH_RADIUS,
  };
  const defaults = {
    zipCode: input.zipCode.trim(),
    category: Object.hasOwn(CATEGORY_LABELS, input.category)
      ? (input.category as ResourceCategory)
      : ("" as const),
    keyword: input.keyword.trim(),
    radius: validRadius(input.radius)
      ? Number(input.radius)
      : DEFAULT_SEARCH_RADIUS,
  };
  let params: SubmittedSearch | null = null;
  let error: string | null = null;
  if (hasIntent) {
    try {
      params = normalizeSearch(input);
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : "Review your search filters.";
    }
  }
  return {
    hasIntent,
    defaults,
    params,
    error,
    key: params ? searchQuery(params) : null,
  };
}
