import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SessionNotice } from "@/components/layout/SessionNotice";
import { ApiError, authApi, invalidateSessionRequests } from "@/lib/api";
import { SESSION_EVENT_KEY } from "@/lib/auth";
import type { AuthResponse } from "@/lib/types";
import { getMockRouter } from "@/test/next-navigation";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    authApi: {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      me: vi.fn(),
    },
    setOnUnauthorized: vi.fn(),
    invalidateSessionRequests: vi.fn(),
  };
});

const authResponse: AuthResponse = {
  expiresIn: 60_000,
  userId: "user-1",
  email: "pat@example.com",
  firstName: "Pat",
  lastName: "Taylor",
  branchOfService: "ARMY",
  zipCode: "12345",
};

function AuthHarness() {
  const { isAuthenticated, login, logout, register, user } = useAuth();

  return (
    <div>
      <SessionNotice />
      <span data-testid="auth-state">
        {isAuthenticated ? "signed-in" : "signed-out"}
      </span>
      {user && <span>{user.firstName}</span>}
      <button
        type="button"
        onClick={() => {
          void login({ email: "pat@example.com", password: "secret" }).catch(
            () => {},
          );
        }}
      >
        Log in
      </button>
      <button
        type="button"
        onClick={() =>
          register({
            firstName: "Pat",
            lastName: "Taylor",
            email: "pat@example.com",
            password: "secret123",
            branchOfService: "ARMY",
            zipCode: "12345",
          })
        }
      >
        Register
      </button>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(authApi.login).mockResolvedValue(authResponse);
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    vi.mocked(authApi.me).mockRejectedValue(
      new ApiError("No active session", 401),
    );
  });

  it("keeps the authenticated profile in memory and redirects after login", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-in");
    });
    expect(screen.getByText("Pat")).toBeInTheDocument();
    expect(localStorage.getItem("vc_token")).toBeNull();
    expect(localStorage.getItem("vc_user")).toBeNull();
    expect(localStorage.getItem("vc_expiry")).toBeNull();
    expect(getMockRouter().push).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps a new registration signed in when the startup session check fails late", async () => {
    const user = userEvent.setup();
    let rejectSessionCheck: (reason?: unknown) => void = () => {};
    vi.mocked(authApi.me).mockReturnValue(
      new Promise((_, reject) => {
        rejectSessionCheck = reject;
      }),
    );
    vi.mocked(authApi.register).mockResolvedValue(authResponse);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-in");
    });

    rejectSessionCheck(new ApiError("No active session", 401));

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-in");
    });
    expect(screen.getByText("Pat")).toBeInTheDocument();
    expect(getMockRouter().push).toHaveBeenCalledWith("/dashboard");
  });

  it("clears stored auth and redirects home on logout", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-in");
    });

    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-out");
    expect(localStorage.getItem("vc_token")).toBeNull();
    expect(authApi.logout).toHaveBeenCalled();
    expect(getMockRouter().push).toHaveBeenLastCalledWith("/");
  });
});

describe("session recovery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(authApi.me).mockResolvedValue(authResponse);
    vi.mocked(authApi.login).mockResolvedValue(authResponse);
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
  });
  const renderSession = () =>
    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>,
    );

  it("restores and signs in even when all storage access throws", async () => {
    for (const method of ["getItem", "setItem", "removeItem"] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new Error("Storage denied");
      });
    }
    renderSession();
    await screen.findByText("Pat");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-in");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("discards an invalid legacy profile and uses /me", async () => {
    localStorage.setItem("vc_user", '{"branchOfService":"invalid"}');
    localStorage.setItem("vc_expiry", "not-a-number");
    renderSession();
    await screen.findByText("Pat");
    expect(localStorage.getItem("vc_user")).toBeNull();
    expect(localStorage.getItem("vc_expiry")).toBeNull();
  });

  it("shows a retryable verification failure without sending logout", async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(new TypeError("Offline"));
    renderSession();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not verify",
    );
    expect(authApi.logout).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Retry session check" }),
    );
    await screen.findByText("Pat");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps a failed logout visible and private content hidden until retry succeeds", async () => {
    vi.mocked(authApi.logout).mockRejectedValueOnce(new TypeError("Offline"));
    renderSession();
    await screen.findByText("Pat");
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sign-out could not be confirmed",
    );
    expect(screen.queryByText("Pat")).not.toBeInTheDocument();
    const checks = vi.mocked(authApi.me).mock.calls.length;
    act(() => window.dispatchEvent(new Event("focus")));
    expect(authApi.me).toHaveBeenCalledTimes(checks);
    await userEvent.click(
      screen.getByRole("button", { name: "Retry sign out" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(authApi.logout).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-out");
  });

  it("reconciles a different tab's account through /me", async () => {
    renderSession();
    await screen.findByText("Pat");
    vi.mocked(authApi.me).mockResolvedValueOnce({
      ...authResponse,
      firstName: "Alex",
      userId: "user-2",
    });
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: SESSION_EVENT_KEY,
          newValue: "changed",
        }),
      ),
    );
    await screen.findByText("Alex");
    expect(screen.queryByText("Pat")).not.toBeInTheDocument();
  });

  it("discovers expiry on focus without issuing a logout request", async () => {
    renderSession();
    await screen.findByText("Pat");
    vi.mocked(authApi.me).mockRejectedValueOnce(new ApiError("Expired", 401));
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() =>
      expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-out"),
    );
    expect(authApi.logout).not.toHaveBeenCalled();
  });
});

it("mounts private effects only after verification and resets them for another account", async () => {
  let verify: (auth: AuthResponse) => void = () => {};
  vi.mocked(authApi.me).mockReturnValueOnce(
    new Promise((resolve) => {
      verify = resolve;
    }),
  );
  const load = vi.fn();
  function PrivateData() {
    useEffect(() => {
      load();
    }, []);
    return <p>Private content</p>;
  }
  render(
    <AuthProvider>
      <ProtectedRoute>
        <PrivateData />
      </ProtectedRoute>
    </AuthProvider>,
  );
  expect(load).not.toHaveBeenCalled();
  await act(async () => {
    verify(authResponse);
  });
  expect(load).toHaveBeenCalledTimes(1);
  vi.mocked(authApi.me).mockResolvedValueOnce({
    ...authResponse,
    userId: "another-user",
  });
  await act(async () => {
    window.dispatchEvent(
      new StorageEvent("storage", { key: SESSION_EVENT_KEY }),
    );
  });
  expect(load).toHaveBeenCalledTimes(2);
});

it("a failed sign-in does not erase an unconfirmed sign-out warning", async () => {
  vi.mocked(authApi.me).mockResolvedValueOnce(authResponse);
  vi.mocked(authApi.logout).mockRejectedValueOnce(new TypeError("Offline"));
  vi.mocked(authApi.login).mockRejectedValueOnce(
    new ApiError("Invalid credentials", 401),
  );
  render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>,
  );
  await screen.findByText("Pat");
  await userEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Sign-out could not be confirmed",
  );
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Sign-out could not be confirmed",
  );
});

it("rechecks expiry periodically using the server session rather than a cached lifetime", async () => {
  vi.useFakeTimers();
  try {
    vi.mocked(authApi.me).mockResolvedValueOnce(authResponse);
    await act(async () => {
      render(
        <AuthProvider>
          <AuthHarness />
        </AuthProvider>,
      );
    });
    expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-in");
    vi.mocked(authApi.me).mockRejectedValueOnce(new ApiError("Expired", 401));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-out");
  } finally {
    vi.useRealTimers();
  }
});

it("invalidates the old account's requests when focus discovers a new identity without storage events", async () => {
  vi.mocked(authApi.me).mockResolvedValueOnce(authResponse);
  render(
    <AuthProvider>
      <AuthHarness />
    </AuthProvider>,
  );
  await screen.findByText("Pat");
  const before = vi.mocked(invalidateSessionRequests).mock.calls.length;
  vi.mocked(authApi.me).mockResolvedValueOnce({
    ...authResponse,
    userId: "user-2",
    firstName: "Alex",
  });
  act(() => {
    window.dispatchEvent(new Event("focus"));
  });
  await screen.findByText("Alex");
  expect(invalidateSessionRequests).toHaveBeenCalledTimes(before + 1);
});
