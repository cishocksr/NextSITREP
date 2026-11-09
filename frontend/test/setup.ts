import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";
import type { NextNavigationMock } from "./next-navigation";

type GlobalWithNavigationMock = typeof globalThis & {
  nextNavigationMock: NextNavigationMock;
};

const createRouterMock = () => ({
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
});

(globalThis as GlobalWithNavigationMock).nextNavigationMock = {
  pathname: "/",
  router: createRouterMock(),
  searchParams: new URLSearchParams(),
  reset() {
    this.pathname = "/";
    this.searchParams = new URLSearchParams();
    for (const handler of Object.values(this.router)) {
      handler.mockReset();
    }
  },
};

vi.mock("next/navigation", () => ({
  usePathname: () =>
    (globalThis as GlobalWithNavigationMock).nextNavigationMock.pathname,
  useRouter: () =>
    (globalThis as GlobalWithNavigationMock).nextNavigationMock.router,
  useSearchParams: () =>
    (globalThis as GlobalWithNavigationMock).nextNavigationMock.searchParams,
}));

vi.mock("next/link", async () => {
  const { createElement } =
    await vi.importActual<typeof import("react")>("react");

  return {
    default: ({
      href,
      children,
      ...props
    }: {
      href: string | URL;
      children: ReactNode;
    }) =>
      createElement(
        "a",
        {
          href: href.toString(),
          ...props,
        },
        children,
      ),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  (globalThis as GlobalWithNavigationMock).nextNavigationMock.reset();
});

// Pointer coordinates are needed for backdrop gestures; jsdom has no PointerEvent.
if (!window.PointerEvent)
  window.PointerEvent = MouseEvent as typeof PointerEvent;

Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: {
    configurable: true,
    value() {
      this.setAttribute("open", "");
    },
  },
  close: {
    configurable: true,
    value() {
      this.removeAttribute("open");
    },
  },
});
