import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/context/AuthContext";
import { resourceApi } from "@/lib/api";
import type { ResourceSearchResult } from "@/lib/types";
import { getMockRouter, setMockSearchParams } from "@/test/next-navigation";
import { deferred, searchResult } from "@/test/resource-fixtures";
import ResourcesPage from "./page";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  resourceApi: { search: vi.fn(), save: vi.fn() },
}));

const session = {
  user: {
    userId: "user-1",
    email: "pat@example.test",
    firstName: "Pat",
    lastName: "Taylor",
    branchOfService: "ARMY" as const,
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
};
function mount(query: string) {
  setMockSearchParams(new URLSearchParams(query));
  const view = render(<ResourcesPage />);
  return (next: string) => {
    setMockSearchParams(new URLSearchParams(next));
    view.rerender(<ResourcesPage />);
  };
}

describe("resource search lifecycle", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useAuth).mockReturnValue(session);
    vi.mocked(resourceApi.search).mockResolvedValue([]);
  });

  it("discards an older response even when its transport ignores cancellation", async () => {
    const older = deferred<ResourceSearchResult[]>();
    const newer = deferred<ResourceSearchResult[]>();
    vi.mocked(resourceApi.search)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const navigate = mount("zipCode=12345&radius=25");
    await waitFor(() => expect(resourceApi.search).toHaveBeenCalledTimes(1));
    const signal = vi.mocked(resourceApi.search).mock.calls[0][1];
    navigate("zipCode=54321&radius=25");
    await waitFor(() => expect(resourceApi.search).toHaveBeenCalledTimes(2));
    expect(signal?.aborted).toBe(true);
    await act(async () =>
      newer.resolve([searchResult({ name: "New clinic" })]),
    );
    expect(screen.getByText("New clinic")).toBeInTheDocument();
    await act(async () =>
      older.resolve([searchResult({ name: "Old clinic" })]),
    );
    expect(screen.queryByText("Old clinic")).not.toBeInTheDocument();
    expect(screen.getByText(/Found 1 resource near 54321/)).toBeInTheDocument();
  });

  it("an older failure cannot stop the current spinner or show an obsolete error", async () => {
    const older = deferred<ResourceSearchResult[]>();
    const newer = deferred<ResourceSearchResult[]>();
    vi.mocked(resourceApi.search)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const navigate = mount("zipCode=12345&radius=25");
    navigate("zipCode=54321&radius=25");
    await act(async () => older.reject(new Error("Old failure")));
    expect(
      screen.getByText("Searching for resources near you..."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => newer.resolve([]));
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("does not relabel earlier results after a failed new search and supports retry", async () => {
    vi.mocked(resourceApi.search)
      .mockResolvedValueOnce([searchResult({ name: "First clinic" })])
      .mockRejectedValueOnce(new Error("Provider unavailable"));
    const navigate = mount("zipCode=12345&radius=25");
    await screen.findByText("First clinic");
    navigate("zipCode=54321&radius=25");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Provider unavailable",
    );
    expect(screen.queryByText("First clinic")).not.toBeInTheDocument();
    expect(screen.queryByText("No results found")).not.toBeInTheDocument();
    vi.mocked(resourceApi.search).mockResolvedValueOnce([
      searchResult({ name: "Retry clinic" }),
    ]);
    await userEvent.click(screen.getByRole("button", { name: "Retry search" }));
    await screen.findByText("Retry clinic");
    expect(screen.getByText(/Found 1 resource near 54321/)).toBeInTheDocument();
  });

  it("canonicalizes a category shortcut without fetching twice", async () => {
    const navigate = mount("category=HOUSING");
    await waitFor(() => expect(resourceApi.search).toHaveBeenCalledTimes(1));
    expect(resourceApi.search).toHaveBeenCalledWith(
      { zipCode: "12345", category: "HOUSING", keyword: undefined, radius: 25 },
      expect.any(AbortSignal),
    );
    expect(getMockRouter().replace).toHaveBeenCalledWith(
      "/resources?zipCode=12345&category=HOUSING&radius=25",
      { scroll: false },
    );
    navigate("zipCode=12345&category=HOUSING&radius=25");
    expect(resourceApi.search).toHaveBeenCalledTimes(1);
  });

  it("commits manual filters to the URL and restores intent on back/forward parameters", async () => {
    const navigate = mount("");
    expect(resourceApi.search).not.toHaveBeenCalled();
    await userEvent.type(
      screen.getByRole("textbox", { name: "Keyword" }),
      " mental health ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    const query = "zipCode=12345&keyword=mental+health&radius=25";
    expect(getMockRouter().push).toHaveBeenCalledWith(`/resources?${query}`, {
      scroll: false,
    });
    navigate(query);
    await waitFor(() => expect(resourceApi.search).toHaveBeenCalledTimes(1));
    navigate("");
    expect(screen.getByText("Ready to find resources?")).toBeInTheDocument();
    navigate(query);
    await waitFor(() => expect(resourceApi.search).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("textbox", { name: "Keyword" })).toHaveValue(
      "mental health",
    );
  });

  it("rejects malformed links before fetching, and can submit corrected filters", async () => {
    const navigate = mount("zipCode=12345&category=toString&radius=Infinity");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "valid resource category",
    );
    expect(resourceApi.search).not.toHaveBeenCalled();
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Search" })
        .closest("form") as HTMLFormElement,
    );
    expect(getMockRouter().push).toHaveBeenCalledWith(
      "/resources?zipCode=12345&radius=25",
      { scroll: false },
    );
    navigate("zipCode=12345&radius=25");
    await waitFor(() => expect(resourceApi.search).toHaveBeenCalledTimes(1));
  });

  it("honors an in-range custom radius instead of showing a blank select", async () => {
    mount("radius=37");
    await waitFor(() => expect(resourceApi.search).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("combobox", { name: "Radius" })).toHaveValue("37");
    expect(vi.mocked(resourceApi.search).mock.calls[0][0].radius).toBe(37);
  });

  it("clears request-local results when the authenticated account changes", async () => {
    const older = deferred<ResourceSearchResult[]>();
    vi.mocked(resourceApi.search)
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce([searchResult({ name: "Other account clinic" })]);
    const navigate = mount("zipCode=12345&radius=25");
    vi.mocked(useAuth).mockReturnValue({
      ...session,
      user: { ...session.user, userId: "user-2" },
    });
    navigate("zipCode=12345&radius=25");
    await screen.findByText("Other account clinic");
    await act(async () =>
      older.resolve([searchResult({ name: "Previous account clinic" })]),
    );
    expect(
      screen.queryByText("Previous account clinic"),
    ).not.toBeInTheDocument();
  });
  it("resets all filter drafts when committed URL intent changes", async () => {
    const navigate = mount("zipCode=12345&category=HEALTHCARE&radius=25");
    await waitFor(() => expect(resourceApi.search).toHaveBeenCalledTimes(1));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Category" }),
      "HOUSING",
    );
    navigate("zipCode=54321&category=HEALTHCARE&radius=25");
    await waitFor(() => expect(resourceApi.search).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue(
      "HEALTHCARE",
    );
    expect(screen.getByRole("textbox", { name: "Zip code" })).toHaveValue(
      "54321",
    );
  });
});
