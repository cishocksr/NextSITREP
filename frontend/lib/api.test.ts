import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authApi,
  invalidateSessionRequests,
  resourceApi,
  setOnUnauthorized,
} from "./api";

const okAuthResponse = {
  expiresIn: 60_000,
  userId: "user-1",
  email: "pat@example.com",
  firstName: "Pat",
  lastName: "Taylor",
  branchOfService: "ARMY",
  zipCode: "12345",
};

const savedResponse = {
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
  notes: "test note",
  savedAt: "2026-11-08T12:00:00Z",
  updatedAt: "2026-11-08T12:00:00Z",
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

  it("returns successful login responses without touching the unauthorized handler", async () => {
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
        .mockResolvedValueOnce(new Response(null, { status: 204 }))
        .mockResolvedValueOnce(
          method === "DELETE" || path.endsWith("logout")
            ? new Response(null, { status: 204 })
            : jsonResponse(
                path.endsWith("login") ? okAuthResponse : savedResponse,
                { status: 200 },
              ),
        );

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
          headers: expect.any(Headers),
        }),
      );
      expect(
        new Headers(fetchMock.mock.calls[1][1]?.headers).get("X-XSRF-TOKEN"),
      ).toBe("test+csrf");
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

describe("session request boundaries", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(document, "cookie", "get").mockReturnValue("XSRF-TOKEN=test-csrf");
  });
  it("does not sign out a valid session on forbidden responses", async () => {
    const unauthorized = vi.fn();
    setOnUnauthorized(unauthorized);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "Access denied" }, { status: 403 }),
    );
    await expect(resourceApi.getSaved()).rejects.toMatchObject({ status: 403 });
    expect(unauthorized).not.toHaveBeenCalled();
  });
  it.each([200, 401])(
    "discards an old session response with HTTP %s",
    async (status) => {
      const unauthorized = vi.fn();
      setOnUnauthorized(unauthorized);
      let complete: (value: Response) => void = () => {};
      vi.spyOn(globalThis, "fetch").mockReturnValue(
        new Promise((resolve) => {
          complete = resolve;
        }),
      );
      const response = resourceApi.getSaved();
      const rejection = expect(response).rejects.toThrow("session changed");
      invalidateSessionRequests();
      complete(
        jsonResponse(status === 200 ? [] : { message: "Old session" }, {
          status,
        }),
      );
      await rejection;
      expect(unauthorized).not.toHaveBeenCalled();
    },
  );
  it("waits for logout to finish before starting a new login", async () => {
    let finishLogout: (value: Response) => void = () => {};
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (path) => {
      calls.push(String(path));
      if (String(path).endsWith("csrf"))
        return new Response(null, { status: 204 });
      if (String(path).endsWith("logout"))
        return new Promise((resolve) => {
          finishLogout = resolve;
        });
      return jsonResponse(okAuthResponse, { status: 200 });
    });
    const logout = authApi.logout();
    await vi.waitFor(() => expect(calls).toContain("/api/v1/auth/logout"));
    const login = authApi.login({
      email: "pat@example.com",
      password: "secret",
    });
    await Promise.resolve();
    expect(calls).not.toContain("/api/v1/auth/login");
    finishLogout(new Response(null, { status: 204 }));
    await logout;
    await expect(login).resolves.toEqual(okAuthResponse);
  });
  it("rejects malformed successful responses before exposing them to components", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([{ category: "unexpected" }], { status: 200 }),
    );
    await expect(resourceApi.getSaved()).rejects.toThrow("unexpected response");
  });
});

it("does not write under a changed session after a pending CSRF bootstrap", async () => {
  vi.restoreAllMocks();
  vi.spyOn(document, "cookie", "get").mockReturnValue("XSRF-TOKEN=test-csrf");
  let finish: (value: Response) => void = () => {};
  const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const pending = resourceApi.unsave("saved-1");
  const rejection = expect(pending).rejects.toThrow("session changed");
  invalidateSessionRequests();
  finish(new Response(null, { status: 204 }));
  await rejection;
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
