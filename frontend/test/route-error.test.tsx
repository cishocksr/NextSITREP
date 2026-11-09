import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DashboardError from "@/app/(dashboard)/error";
import PageError from "@/app/error";

describe("route error recovery", () => {
  it.each([
    [PageError, "This page is unavailable"],
    [DashboardError, "This workspace is unavailable"],
  ] as const)(
    "offers a focused, safe fallback through %s",
    async (Fallback, heading) => {
      const retry = vi.fn();
      const reset = vi.fn();
      const view = render(
        <Fallback
          error={new Error("Private diagnostic detail")}
          reset={reset}
          retry={retry}
        />,
      );
      expect(screen.getByRole("heading", { name: heading })).toHaveFocus();
      expect(view.container.textContent).not.toContain(
        "Private diagnostic detail",
      );
      expect(
        screen.getByRole("link", { name: "Go to home page" }),
      ).toHaveAttribute("href", "/");
      await userEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(retry).toHaveBeenCalledOnce();
      expect(reset).not.toHaveBeenCalled();
    },
  );
});
