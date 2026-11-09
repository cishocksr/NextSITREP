import type { ResourceSearchResult, SavedResourceResponse } from "@/lib/types";

const fields = {
  externalId: "facility-1",
  sourceApi: "VA",
  name: "Clinic",
  category: "HEALTHCARE" as const,
  description: null,
  phone: null,
  website: null,
  address: null,
  city: null,
  state: null,
  zipCode: null,
};
export function searchResult(
  overrides: Partial<ResourceSearchResult> = {},
): ResourceSearchResult {
  return { ...fields, distanceMiles: 1, isSaved: false, ...overrides };
}
export function savedResource(
  overrides: Partial<SavedResourceResponse> = {},
): SavedResourceResponse {
  return {
    ...fields,
    id: "saved-1",
    notes: "Original notes",
    savedAt: "2026-11-08T12:00:00Z",
    updatedAt: "2026-11-08T12:00:00Z",
    ...overrides,
  };
}
export function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}
