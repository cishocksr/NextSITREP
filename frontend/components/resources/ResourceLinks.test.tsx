import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ResourceSearchResult, SavedResourceResponse } from "@/lib/types";
import { websiteUrl } from "@/lib/website";
import { ResourceCard } from "./ResourceCard";
import { SavedResourceCard } from "./SavedResourceCard";

const resource = {
  externalId: "facility-1",
  sourceApi: "VA",
  name: "Clinic",
  category: "HEALTHCARE",
  description: null,
  phone: null,
  website: null,
  address: null,
  city: null,
  state: null,
  zipCode: null,
  isSaved: false,
  distanceMiles: null,
} satisfies ResourceSearchResult;
const saved = {
  ...resource,
  id: "saved-1",
  notes: null,
  savedAt: "2026-11-08T12:00:00Z",
  updatedAt: "2026-11-08T12:00:00Z",
} satisfies SavedResourceResponse;

describe("provider website links", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///tmp/test",
    "/relative",
    "//example.test",
    "https://user:pass@example.test",
    "https://",
    "https://example.test/has space",
    " https://example.test",
    `https://example.test/${String.fromCharCode(10)}`,
  ])("rejects invalid destinations: %j", (value) => {
    expect(websiteUrl(value)).toBeNull();
  });
  it.each([
    "http://example.test/path",
    "https://example.test/path?value=one#section",
  ])("preserves valid provider URLs: %s", (value) => {
    expect(websiteUrl(value)).toBe(value);
  });
  it("hides invalid legacy URLs in both search and saved cards", () => {
    render(
      <>
        <ResourceCard
          resource={{ ...resource, website: "javascript:alert(1)" }}
        />
        <SavedResourceCard
          resource={{ ...saved, website: "data:text/html,test" }}
          onRemoved={() => {}}
          onUpdated={() => {}}
        />
      </>,
    );
    expect(
      screen.queryByRole("link", { name: "Visit website" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Clinic")).toHaveLength(2);
  });
  it("renders an accepted destination as a link", () => {
    render(
      <ResourceCard
        resource={{ ...resource, website: "https://example.test/path" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Visit website" })).toHaveAttribute(
      "href",
      "https://example.test/path",
    );
  });
});
