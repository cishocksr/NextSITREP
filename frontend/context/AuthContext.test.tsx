import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";
import { getMockRouter } from "@/test/next-navigation";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("@/lib/api", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
  setOnUnauthorized: vi.fn(),
}));

const authResponse: AuthResponse = {
  token: "test-token",
  tokenType: "Bearer",
  expiresIn: 60_000,
  userId: "user-1",
  email: "pat@example.com",
  firstName: "Pat",
  lastName: "Taylor",
  branchOfService: "ARMY",
};

function AuthHarness() {
  const { isAuthenticated, login, logout, user } = useAuth();

  return (
    <div>
      <span data-testid="auth-state">
        {isAuthenticated ? "signed-in" : "signed-out"}
      </span>
      {user && <span>{user.firstName}</span>}
      <button
        type="button"
        onClick={() => login({ email: "pat@example.com", password: "secret" })}
      >
        Log in
      </button>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(authApi.login).mockResolvedValue(authResponse);
  });

  it("stores the authenticated user and redirects through the app router after login", async () => {
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
    expect(localStorage.getItem("vc_token")).toBe("test-token");
    expect(getMockRouter().push).toHaveBeenCalledWith("/resources");
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
    expect(getMockRouter().push).toHaveBeenLastCalledWith("/");
  });
});
