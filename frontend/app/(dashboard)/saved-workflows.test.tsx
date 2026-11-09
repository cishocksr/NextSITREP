import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/context/AuthContext";
import { resourceApi } from "@/lib/api";
import { getMockRouter } from "@/test/next-navigation";
import { savedResource } from "@/test/resource-fixtures";
import DashboardPage from "./dashboard/page";
import SavedPage from "./saved/page";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  resourceApi: { getSaved: vi.fn(), unsave: vi.fn(), updateNotes: vi.fn() },
}));

describe("saved resource recovery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        userId: "user-1",
        email: "pat@example.test",
        firstName: "Pat",
        lastName: "Taylor",
        branchOfService: "ARMY",
        zipCode: "12345",
      },
      isLoading: false,
      isAuthenticated: true,
      isSigningOut: false,
      sessionIssue: null,
      retrySession: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(resourceApi.getSaved).mockResolvedValue([]);
    vi.mocked(resourceApi.unsave).mockResolvedValue(undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("keeps an initial load failure distinct from empty until retry succeeds", async () => {
    vi.mocked(resourceApi.getSaved).mockRejectedValueOnce(
      new Error("Library unavailable"),
    );
    render(<SavedPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Library unavailable",
    );
    expect(
      screen.queryByText("No saved resources yet"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("0 saved resources")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Dismiss" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Retry loading saved resources" }),
    );
    await screen.findByText("No saved resources yet");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("returns to All when removal eliminates the selected category", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(resourceApi.getSaved).mockResolvedValueOnce([
      savedResource({ name: "Health clinic" }),
      savedResource({
        id: "saved-2",
        externalId: "facility-2",
        category: "HOUSING",
        name: "Housing center",
      }),
    ]);
    render(<SavedPage />);
    await screen.findByText("Health clinic");
    await userEvent.click(
      screen.getByRole("button", { name: "Healthcare (1)" }),
    );
    expect(screen.queryByText("Housing center")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    await screen.findByText("Housing center");
    expect(screen.getByRole("button", { name: "All (1)" })).toHaveClass(
      "bg-blue-600",
    );
    expect(
      screen.queryByRole("button", { name: "Healthcare (0)" }),
    ).not.toBeInTheDocument();
    expect(resourceApi.unsave).toHaveBeenCalledWith("saved-1");
  });

  it("does not present failed dashboard counts as zero, None, or an empty library", async () => {
    vi.mocked(resourceApi.getSaved).mockRejectedValueOnce(
      new Error("Dashboard unavailable"),
    );
    render(<DashboardPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dashboard unavailable",
    );
    expect(screen.queryByText("Nothing saved yet")).not.toBeInTheDocument();
    expect(screen.queryByText("None")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
    vi.mocked(resourceApi.getSaved).mockResolvedValueOnce([
      savedResource({ name: "Recovered clinic" }),
    ]);
    await userEvent.click(
      screen.getByRole("button", { name: "Retry loading saved resources" }),
    );
    await screen.findByText("Recovered clinic");
    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
    expect(screen.getByText("Latest saves (up to 3)")).toBeInTheDocument();
  });

  it("uses the shared query policy when dashboard search navigates", async () => {
    render(<DashboardPage />);
    await screen.findByText("Nothing saved yet");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Category" }),
      "HOUSING",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Radius" }),
      "50",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Keyword" }),
      " shelter ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(getMockRouter().push).toHaveBeenCalledWith(
      "/resources?zipCode=12345&category=HOUSING&keyword=shelter&radius=50",
    );
  });

  it("checks ZIP characters even when browser form validation is bypassed", async () => {
    render(<DashboardPage />);
    await screen.findByText("Nothing saved yet");
    fireEvent.change(screen.getByRole("textbox", { name: "ZIP" }), {
      target: { value: "abcde" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Search" })
        .closest("form") as HTMLFormElement,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("five-digit ZIP");
    expect(getMockRouter().push).not.toHaveBeenCalled();
  });
});
