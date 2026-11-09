import { describe, expect, it } from "vitest";
import { normalizeSearch, readSearchQuery, searchQuery } from "./search";

describe("resource search contract", () => {
  it.each(["", "0", "-1", "Infinity", "NaN", "1.5", "101", "1e2"])(
    "rejects invalid URL radius %j",
    (radius) => {
      const result = readSearchQuery(
        new URLSearchParams({ zipCode: "12345", radius }).toString(),
      );
      expect(result.params).toBeNull();
      expect(result.error).toContain("radius");
    },
  );
  it.each(["toString", "__proto__", "OTHER"])(
    "rejects categories outside the own-key allowlist: %s",
    (category) => {
      expect(() => normalizeSearch({ zipCode: "12345", category })).toThrow(
        "category",
      );
    },
  );
  it.each(["abcde", "1234", "123456", ""])(
    "rejects invalid explicit ZIP %j",
    (zipCode) => {
      expect(
        readSearchQuery(new URLSearchParams({ zipCode }).toString(), "54321")
          .params,
      ).toBeNull();
    },
  );
  it("uses the profile ZIP only when the URL does not supply one", () => {
    expect(readSearchQuery("category=HOUSING", "12345").params).toEqual({
      zipCode: "12345",
      category: "HOUSING",
      radius: 25,
      keyword: undefined,
    });
    expect(readSearchQuery("zipCode=54321", "12345").params?.zipCode).toBe(
      "54321",
    );
  });
  it("does not automatically search a profile without URL search intent", () => {
    expect(readSearchQuery("", "12345")).toMatchObject({
      hasIntent: false,
      params: null,
      error: null,
    });
  });
  it("honors any whole-number radius within the backend's range, including a radius-only link", () => {
    expect(readSearchQuery("radius=37", "12345").params?.radius).toBe(37);
  });
  it("round trips encoded values through one canonical submitted query", () => {
    const input = {
      zipCode: " 12345 ",
      keyword: " health & care ",
      category: "HOUSING",
      radius: 37,
    };
    const query = searchQuery(input);
    expect(query).toBe(
      "zipCode=12345&category=HOUSING&keyword=health+%26+care&radius=37",
    );
    expect(readSearchQuery(query).params).toEqual(normalizeSearch(input));
  });
});
