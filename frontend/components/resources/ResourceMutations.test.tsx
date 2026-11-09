import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, resourceApi } from "@/lib/api";
import type { SavedResourceResponse } from "@/lib/types";
import {
  deferred,
  savedResource,
  searchResult,
} from "@/test/resource-fixtures";
import { NotesModal } from "./NotesModal";
import { ResourceCard } from "./ResourceCard";
import { SavedResourceCard } from "./SavedResourceCard";

vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  resourceApi: { save: vi.fn(), unsave: vi.fn(), updateNotes: vi.fn() },
}));

describe("resource mutations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([409, 503])(
    "shows save failure HTTP %s without claiming success and allows retry",
    async (status) => {
      vi.mocked(resourceApi.save)
        .mockRejectedValueOnce(new ApiError("Save rejected", status))
        .mockResolvedValueOnce(savedResource());
      const onSaved = vi.fn();
      render(<ResourceCard resource={searchResult()} onSaved={onSaved} />);
      await userEvent.click(
        screen.getByRole("button", { name: "Save Resource" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not save Clinic",
      );
      expect(onSaved).not.toHaveBeenCalled();
      await userEvent.click(
        screen.getByRole("button", { name: "Save Resource" }),
      );
      expect(
        await screen.findByRole("button", { name: "✓ Saved" }),
      ).toBeDisabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(onSaved).toHaveBeenCalledOnce();
    },
  );

  it("keeps a resource after failed removal and reports success only after retry", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(resourceApi.unsave)
      .mockRejectedValueOnce(new Error("Removal unavailable"))
      .mockResolvedValueOnce(undefined);
    const onRemoved = vi.fn();
    render(
      <SavedResourceCard
        resource={savedResource()}
        onRemoved={onRemoved}
        onUpdated={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Removal unavailable",
    );
    expect(screen.getByText("Clinic")).toBeInTheDocument();
    expect(onRemoved).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onRemoved).toHaveBeenCalledExactlyOnceWith("saved-1");
  });

  it("ignores a save callback after its card leaves the current results", async () => {
    const pending = deferred<SavedResourceResponse>();
    vi.mocked(resourceApi.save).mockReturnValueOnce(pending.promise);
    const onSaved = vi.fn();
    const view = render(
      <ResourceCard resource={searchResult()} onSaved={onSaved} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Save Resource" }),
    );
    view.unmount();
    await act(async () => pending.resolve(savedResource()));
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("notes editor lifecycle", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(["Cancel", "Close", "Close notes modal", "Escape"])(
    "asks before discarding a dirty draft via %s",
    async (action) => {
      const confirm = vi
        .spyOn(window, "confirm")
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      const onClose = vi.fn();
      render(
        <NotesModal
          resource={savedResource()}
          onClose={onClose}
          onUpdated={vi.fn()}
        />,
      );
      fireEvent.change(
        screen.getByRole("textbox", { name: "Resource notes" }),
        { target: { value: "Unsaved draft" } },
      );
      const close = () =>
        action === "Escape"
          ? fireEvent.keyDown(window, { key: "Escape" })
          : fireEvent.click(screen.getByRole("button", { name: action }));
      close();
      expect(onClose).not.toHaveBeenCalled();
      expect(
        screen.getByRole("textbox", { name: "Resource notes" }),
      ).toHaveValue("Unsaved draft");
      close();
      expect(confirm).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledOnce();
    },
  );

  it("blocks dismissal, duplicate save and edits while a save is pending", async () => {
    const pending = deferred<SavedResourceResponse>();
    vi.mocked(resourceApi.updateNotes).mockReturnValueOnce(pending.promise);
    const onClose = vi.fn();
    const onUpdated = vi.fn();
    const confirm = vi.spyOn(window, "confirm");
    render(
      <NotesModal
        resource={savedResource()}
        onClose={onClose}
        onUpdated={onUpdated}
      />,
    );
    const textarea = screen.getByRole("textbox", { name: "Resource notes" });
    fireEvent.change(textarea, { target: { value: "Save this draft" } });
    await userEvent.click(screen.getByRole("button", { name: "Save Notes" }));
    expect(textarea).toHaveAttribute("readonly");
    for (const name of ["Cancel", "Close", "Close notes modal", "Save Notes"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name }));
    }
    fireEvent.keyDown(window, { key: "Escape" });
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(resourceApi.updateNotes).toHaveBeenCalledExactlyOnceWith("saved-1", {
      notes: "Save this draft",
    });
    await act(async () =>
      pending.resolve(savedResource({ notes: "Save this draft" })),
    );
    expect(onUpdated).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("preserves a failed draft and lets the same editor retry", async () => {
    vi.mocked(resourceApi.updateNotes)
      .mockRejectedValueOnce(new Error("Notes unavailable"))
      .mockResolvedValueOnce(savedResource({ notes: "Keep my draft" }));
    const onUpdated = vi.fn();
    const onClose = vi.fn();
    render(
      <NotesModal
        resource={savedResource()}
        onClose={onClose}
        onUpdated={onUpdated}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Resource notes" }), {
      target: { value: "Keep my draft" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Save Notes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Notes unavailable",
    );
    expect(screen.getByRole("textbox", { name: "Resource notes" })).toHaveValue(
      "Keep my draft",
    );
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Save Notes" }));
    expect(onUpdated).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("an obsolete save cannot update or close a newly mounted editor", async () => {
    const pending = deferred<SavedResourceResponse>();
    vi.mocked(resourceApi.updateNotes).mockReturnValueOnce(pending.promise);
    const oldClose = vi.fn();
    const oldUpdated = vi.fn();
    const first = render(
      <NotesModal
        resource={savedResource()}
        onClose={oldClose}
        onUpdated={oldUpdated}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save Notes" }));
    first.unmount();
    const newClose = vi.fn();
    const newUpdated = vi.fn();
    render(
      <NotesModal
        resource={savedResource()}
        onClose={newClose}
        onUpdated={newUpdated}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Resource notes" }), {
      target: { value: "New editor draft" },
    });
    await act(async () =>
      pending.resolve(savedResource({ notes: "Old completion" })),
    );
    expect(oldClose).not.toHaveBeenCalled();
    expect(oldUpdated).not.toHaveBeenCalled();
    expect(newClose).not.toHaveBeenCalled();
    expect(newUpdated).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Resource notes" })).toHaveValue(
      "New editor draft",
    );
  });
});
