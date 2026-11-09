import { describe, expect, it } from "vitest";
import { decodeAuth, decodeSavedResources, requestHeaders } from "./contracts";

const profile = {
  userId: "user-1",
  email: "pat@example.test",
  firstName: "Pat",
  lastName: "Taylor",
  branchOfService: "ARMY",
  zipCode: "12345",
  expiresIn: 60000,
};

describe("runtime contracts", () => {
  it.each([
    null,
    {},
    { ...profile, branchOfService: "toString" },
    { ...profile, expiresIn: Infinity },
    { ...profile, userId: null },
  ])("rejects malformed session data: %j", (value) => {
    expect(() => decodeAuth(value)).toThrow("unexpected response");
  });
  it("accepts a valid session without treating additional fields as trusted controls", () => {
    expect(decodeAuth(profile)).toEqual(profile);
  });
  it("rejects invalid saved-resource timestamps before formatting can crash rendering", () => {
    expect(() =>
      decodeSavedResources([
        {
          id: "saved-1",
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
          notes: null,
          savedAt: "invalid",
          updatedAt: "2026-11-08T12:00:00Z",
        },
      ]),
    ).toThrow("unexpected response");
  });
  it.each<HeadersInit>([
    new Headers({ "X-Example": "test" }),
    [["X-Example", "test"]],
    { "X-Example": "test" },
  ])("preserves each supported HeadersInit representation", (input) => {
    const result = requestHeaders(input);
    expect(result.get("X-Example")).toBe("test");
    expect(result.get("Content-Type")).toBe("application/json");
  });
});
