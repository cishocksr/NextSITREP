import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/context/AuthContext";
import { setMockPathname } from "@/test/next-navigation";
import { Navbar } from "./Navbar";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("Navbar", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("renders guest navigation when the user is signed out", () => {
    render(<Navbar />);

    expect(screen.getByRole("link", { name: /veteran fob/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("marks the current app route as active for signed-in users", () => {
    setMockPathname("/saved");
    mockedUseAuth.mockReturnValue({
      user: {
        userId: "user-1",
        email: "pat@example.com",
        firstName: "Pat",
        lastName: "Taylor",
        branchOfService: "ARMY",
        zipCode: "12345",
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<Navbar />);

    expect(screen.getByRole("link", { name: /veteran fob/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    for (const savedLink of screen.getAllByRole("link", { name: "Saved" })) {
      expect(savedLink).toHaveClass("bg-blue-50", "text-blue-700");
    }
    expect(screen.getByText("Pat Taylor")).toBeInTheDocument();
  });
});
