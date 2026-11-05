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
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
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

describe("same-origin API and CSRF transport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(document, "cookie", "get").mockReturnValue(
      "other=one; XSRF-TOKEN=test%2Bcsrf",
    );
  });

  it("reads through the app origin without bootstrapping CSRF", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse([], { status: 200 }));

    await resourceApi.search({ zipCode: "12345", keyword: "health & care" });

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "/api/v1/resources/search?zipCode=12345&keyword=health+%26+care",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it.each([
    [
      "login",
      () =>
        authApi.login({ email: "pat@example.com", password: "Password123" }),
      "POST",
      "/api/v1/auth/login",
    ],
    ["logout", () => authApi.logout(), "POST", "/api/v1/auth/logout"],
    [
      "update notes",
      () => resourceApi.updateNotes("saved-1", { notes: "test note" }),
      "PATCH",
      "/api/v1/resources/saved/saved-1/notes",
    ],
    [
      "remove saved resource",
      () => resourceApi.unsave("saved-1"),
      "DELETE",
      "/api/v1/resources/saved/saved-1",
    ],
  ] as const)(
    "bootstraps %s and sends the decoded CSRF header on the app origin",
    async (_name, call, method, path) => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(null, { status: 204 }));

      await call();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/auth/csrf", {
        credentials: "include",
        cache: "no-store",
      });
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        path,
        expect.objectContaining({
          method,
          credentials: "include",
          headers: expect.objectContaining({ "X-XSRF-TOKEN": "test+csrf" }),
        }),
      );
    },
  );

  it("stops the write if bootstrap fails, even when an old cookie exists", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 503 }));

    await expect(authApi.logout()).rejects.toThrow(
      "Unable to initialize request security",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops the write if the browser cannot read a CSRF cookie", async () => {
    vi.spyOn(document, "cookie", "get").mockReturnValue("unrelated=cookie");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await expect(authApi.logout()).rejects.toThrow(
      "Request security cookie is unavailable",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
