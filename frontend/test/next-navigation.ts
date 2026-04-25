import type { vi } from "vitest";

type RouterFunction = ReturnType<typeof vi.fn>;

export interface AppRouterMock {
  back: RouterFunction;
  forward: RouterFunction;
  prefetch: RouterFunction;
  push: RouterFunction;
  refresh: RouterFunction;
  replace: RouterFunction;
}

export interface NextNavigationMock {
  pathname: string;
  router: AppRouterMock;
  searchParams: URLSearchParams;
  reset: () => void;
}

type GlobalWithNavigationMock = typeof globalThis & {
  nextNavigationMock: NextNavigationMock;
};

function getNavigationMock(): NextNavigationMock {
  return (globalThis as GlobalWithNavigationMock).nextNavigationMock;
}

export function getMockRouter(): AppRouterMock {
  return getNavigationMock().router;
}

export function setMockPathname(pathname: string): void {
  getNavigationMock().pathname = pathname;
}

export function setMockSearchParams(searchParams: URLSearchParams): void {
  getNavigationMock().searchParams = searchParams;
}
