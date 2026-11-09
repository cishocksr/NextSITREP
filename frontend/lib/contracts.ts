import type {
  AuthResponse,
  ResourceSearchResult,
  SavedResourceResponse,
} from "./types";
import { BRANCH_LABELS, CATEGORY_LABELS } from "./types";

type ObjectValue = Record<string, unknown>;
const isObject = (value: unknown): value is ObjectValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nullableText = (value: unknown) =>
  value === null || typeof value === "string";
const nonemptyText = (value: unknown) =>
  typeof value === "string" && value.length > 0;
const dateText = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

function isAuth(value: unknown): value is AuthResponse {
  return (
    isObject(value) &&
    nonemptyText(value.userId) &&
    ["email", "firstName", "lastName", "zipCode"].every(
      (key) => typeof value[key] === "string",
    ) &&
    typeof value.branchOfService === "string" &&
    Object.hasOwn(BRANCH_LABELS, value.branchOfService) &&
    typeof value.expiresIn === "number" &&
    Number.isFinite(value.expiresIn) &&
    value.expiresIn >= 0
  );
}

function isResource(value: unknown): value is ObjectValue {
  return (
    isObject(value) &&
    ["externalId", "sourceApi", "name"].every((key) =>
      nonemptyText(value[key]),
    ) &&
    [
      "description",
      "phone",
      "website",
      "address",
      "city",
      "state",
      "zipCode",
    ].every((key) => nullableText(value[key])) &&
    typeof value.category === "string" &&
    Object.hasOwn(CATEGORY_LABELS, value.category)
  );
}

function isSearchResult(value: unknown): value is ResourceSearchResult {
  return (
    isResource(value) &&
    typeof value.isSaved === "boolean" &&
    (value.distanceMiles === null ||
      (typeof value.distanceMiles === "number" &&
        Number.isFinite(value.distanceMiles) &&
        value.distanceMiles >= 0))
  );
}

function isSavedResource(value: unknown): value is SavedResourceResponse {
  return (
    isResource(value) &&
    nonemptyText(value.id) &&
    nullableText(value.notes) &&
    dateText(value.savedAt) &&
    dateText(value.updatedAt)
  );
}

function decode<T>(value: unknown, accepts: (value: unknown) => value is T): T {
  if (!accepts(value))
    throw new Error(
      "The server returned an unexpected response. Please try again.",
    );
  return value;
}

export const decodeAuth = (value: unknown) => decode(value, isAuth);
export const decodeSavedResource = (value: unknown) =>
  decode(value, isSavedResource);
export const decodeSearchResults = (value: unknown) =>
  decode(
    value,
    (items): items is ResourceSearchResult[] =>
      Array.isArray(items) && items.every(isSearchResult),
  );
export const decodeSavedResources = (value: unknown) =>
  decode(
    value,
    (items): items is SavedResourceResponse[] =>
      Array.isArray(items) && items.every(isSavedResource),
  );
export function decodeEmpty(value: unknown): void {
  if (value !== undefined)
    throw new Error(
      "The server returned an unexpected response. Please try again.",
    );
}

export function requestHeaders(input?: HeadersInit): Headers {
  const headers = new Headers(input);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  return headers;
}
