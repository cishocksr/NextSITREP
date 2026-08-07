import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi, resourceApi, setOnUnauthorized } from "./api";

const okAuthResponse = {
  expiresIn: 60_000,
  userId: "user-1",
  email: "pat@example.com",
  firstName: "Pat",
  lastName: "Taylor",
  branchOfService: "ARMY",
  zipCode: "12345",
};

function jsonResponse(body: unknown, init: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

describe("api unauthorized handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(document, "cookie", "get").mockReturnValue("XSRF-TOKEN=test-csrf");
  });

  it("does not run the global unauthorized handler when login fails", async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "Invalid email or password" }, { status: 401 }),
    );

    await expect(
      authApi.login({ email: "pat@example.com", password: "wrong" }),
    ).rejects.toThrow("Invalid email or password");

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does run the global unauthorized handler for protected API calls", async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "Authentication required" }, { status: 401 }),
    );

    await expect(resourceApi.getSaved()).rejects.toThrow(
      "Authentication required",
    );

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("stores successful login responses without touching the unauthorized handler", async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(okAuthResponse, { status: 200 }),
    );

    await expect(
      authApi.login({ email: "pat@example.com", password: "Password123" }),
    ).resolves.toEqual(okAuthResponse);

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
