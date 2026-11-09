import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Navbar } from "@/components/layout/Navbar";
import { NotesModal } from "@/components/resources/NotesModal";
import { SavedResourceCard } from "@/components/resources/SavedResourceCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import { savedResource } from "@/test/resource-fixtures";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isSigningOut: false,
    sessionIssue: null,
    retrySession: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
});

describe("accessible shared controls", () => {
  it("keeps duplicate labels distinct and associates hints and errors with their own inputs", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <>
        <span id="extra">Existing help</span>
        <Input
          label="ZIP"
          hint="Nearby searches"
          ref={ref}
          aria-describedby="extra"
        />
        <Input label="ZIP" error="Enter five digits" />
      </>,
    );
    const [first, second] = screen.getAllByLabelText("ZIP");
    expect(first.id).not.toBe(second.id);
    expect(first).toHaveAccessibleDescription("Existing help Nearby searches");
    expect(second).toHaveAccessibleDescription("Enter five digits");
    expect(second).toHaveAttribute("aria-invalid", "true");
    ref.current?.focus();
    expect(first).toHaveFocus();
  });
  it("preserves explicit IDs and caller invalid states without a component error", () => {
    render(<Input id="postal" label="Postal code" aria-invalid="grammar" />);
    expect(screen.getByLabelText("Postal code")).toHaveAttribute(
      "id",
      "postal",
    );
    expect(screen.getByLabelText("Postal code")).toHaveAttribute(
      "aria-invalid",
      "grammar",
    );
  });
  it("labels duplicate selects independently and connects their error messages", () => {
    render(
      <>
        <Select label="Category" options={[]} />
        <Select label="Category" options={[]} error="Choose a category" />
      </>,
    );
    const [first, second] = screen.getAllByLabelText("Category");
    expect(first.id).not.toBe(second.id);
    expect(second).toHaveAccessibleDescription("Choose a category");
    expect(second).toHaveAttribute("aria-invalid", "true");
  });
  it("does not accidentally submit a form when an ordinary button is activated", async () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <Button>Ordinary action</Button>
        <Button type="submit">Submit</Button>
      </form>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Ordinary action" }),
    );
    expect(submit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(submit).toHaveBeenCalledOnce();
  });
  it("reserves assertive announcements for errors and names loading without visible text", () => {
    render(
      <>
        <Alert variant="error" message="Failed" />
        <Alert variant="success" message="Saved" />
        <LoadingSpinner />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
    expect(
      screen.getAllByRole("status").map((element) => element.textContent),
    ).toEqual(["Saved", "Loading…"]);
  });
});

describe("accessible workflows", () => {
  it("uses standalone navigation links and exposes the current page", () => {
    const auth = useAuth();
    vi.mocked(useAuth).mockReturnValue({ ...auth, isAuthenticated: true });
    // Set navigation through the same global mock used by all route tests.
    (
      globalThis as typeof globalThis & {
        nextNavigationMock: { pathname: string };
      }
    ).nextNavigationMock.pathname = "/saved";
    const view = render(<Navbar />);
    expect(
      screen.getByRole("navigation", { name: "Primary" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Saved" })
        .every((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
    expect(view.container.querySelector("a button")).toBeNull();
  });
  it("guest CTAs have a single focus target each", () => {
    const view = render(<Navbar />);
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(view.container.querySelector("a button")).toBeNull();
  });
  it("names repeated note actions and exposes the expanded preview state", async () => {
    render(
      <SavedResourceCard
        resource={savedResource({ notes: "Long notes. ".repeat(30) })}
        onRemoved={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    const expand = screen.getByRole("button", {
      name: "Show more notes for Clinic",
    });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    const preview = document.getElementById(
      expand.getAttribute("aria-controls") ?? "",
    );
    expect(preview?.textContent).toContain("…");
    await userEvent.click(expand);
    expect(
      screen.getByRole("button", { name: "Show less notes for Clinic" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(preview?.textContent).toBe("Long notes. ".repeat(30));
    expect(
      screen.getByRole("button", { name: "Edit Notes: Clinic" }),
    ).toBeInTheDocument();
  });
  it("returns focus to the connected opener when the notes editor unmounts", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const view = render(
      <NotesModal
        resource={savedResource()}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "Resource notes" }),
    ).toHaveFocus();
    expect(
      screen.getByRole("dialog", { name: "Notes: Clinic" }),
    ).toHaveAttribute("open");
    view.unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it("cycles Tab at both editor boundaries", () => {
    render(
      <NotesModal
        resource={savedResource()}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    const first = screen.getByRole("button", { name: "Close" });
    const last = screen.getByRole("button", { name: "Save Notes" });
    last.focus();
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });
  it("does not dismiss a dialog when a drag starts inside and ends over the backdrop", () => {
    const close = vi.fn();
    render(
      <NotesModal
        resource={savedResource()}
        onClose={close}
        onUpdated={vi.fn()}
      />,
    );
    fireEvent.pointerDown(
      screen.getByRole("textbox", { name: "Resource notes" }),
    );
    fireEvent.pointerUp(screen.getByRole("dialog"), {
      clientX: -1,
      clientY: -1,
    });
    expect(close).not.toHaveBeenCalled();
  });
  it("focuses and describes a mismatched confirmation before calling registration", async () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("Branch of service"), {
      target: { value: "ARMY" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "long-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different-password" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Create Account" })
        .closest("form") as HTMLFormElement,
    );
    expect(screen.getByLabelText("Confirm password")).toHaveFocus();
    expect(
      screen.getByLabelText("Confirm password"),
    ).toHaveAccessibleDescription("Passwords do not match.");
    expect(useAuth().register).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Confirm password"), "x");
    expect(screen.getByLabelText("Confirm password")).not.toHaveAttribute(
      "aria-invalid",
    );
  });
});
