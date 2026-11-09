import {
  decodeAuth,
  decodeEmpty,
  decodeSavedResource,
  decodeSavedResources,
  decodeSearchResults,
  requestHeaders,
} from "./contracts";
import { searchQuery } from "./search";
import type {
  AuthResponse,
  LoginRequest,
  ResourceSearchParams,
  ResourceSearchResult,
  SavedResourceResponse,
  SaveResourceRequest,
  UpdateNotesRequest,
  UserRegistrationRequest,
} from "./types";

// Browser requests always use the app origin. Next/ingress forwards /api to Spring.

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
  return () => {
    if (onUnauthorized === fn) onUnauthorized = null;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class SessionChangedError extends Error {
  constructor() {
    super("The session changed. Please try again.");
  }
}

let sessionVersion = 0;
export function invalidateSessionRequests(): void {
  sessionVersion += 1;
}

// A delayed logout response must finish before a later login sets its cookie.
let authTransition: Promise<void> = Promise.resolve();
function transition<T>(operation: () => Promise<T>): Promise<T> {
  invalidateSessionRequests();
  const result = authTransition.then(operation);
  const settled = result.finally(invalidateSessionRequests);
  authTransition = settled.then(
    () => undefined,
    () => undefined,
  );
  return settled;
}

type ApiRequestOptions = RequestInit & {
  skipUnauthorizedHandler?: boolean;
};

function isUnsafeMethod(method?: string): boolean {
  const normalized = method?.toUpperCase() ?? "GET";
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(normalized);
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(name.length + 1));
}

async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/v1/auth/csrf", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to initialize request security. Please try again.");
  }

  const token = readCookie(CSRF_COOKIE_NAME);
  if (!token) {
    throw new Error(
      "Request security cookie is unavailable. Please allow cookies and try again.",
    );
  }
  return token;
}

async function request<T>(
  path: string,
  decode: (value: unknown) => T,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { skipUnauthorizedHandler = false, ...fetchOptions } = options;

  const version = sessionVersion;
  const headers = requestHeaders(fetchOptions.headers);

  if (isUnsafeMethod(fetchOptions.method)) {
    headers.set(CSRF_HEADER_NAME, await getCsrfToken());
  }

  if (!skipUnauthorizedHandler && version !== sessionVersion)
    throw new SessionChangedError();

  const res = await fetch(path, {
    ...fetchOptions,
    credentials: "include",
    headers,
  });

  if (!skipUnauthorizedHandler && version !== sessionVersion)
    throw new SessionChangedError();

  if (!skipUnauthorizedHandler && res.status === 401) {
    onUnauthorized?.();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body === "object") {
        const detail = body.message ?? body.error;
        if (typeof detail === "string") message = detail;
      }
    } catch {
      message = `Request failed (${res.status})`;
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return decode(undefined);
  }

  let value: unknown;
  try {
    value = await res.json();
  } catch {
    throw new Error(
      "The server returned an unexpected response. Please try again.",
    );
  }
  if (!skipUnauthorizedHandler && version !== sessionVersion)
    throw new SessionChangedError();
  return decode(value);
}

export const authApi = {
  register(data: UserRegistrationRequest): Promise<AuthResponse> {
    return transition(() =>
      request("/api/v1/auth/register", decodeAuth, {
        method: "POST",
        body: JSON.stringify(data),
        skipUnauthorizedHandler: true,
      }),
    );
  },

  login(data: LoginRequest): Promise<AuthResponse> {
    return transition(() =>
      request("/api/v1/auth/login", decodeAuth, {
        method: "POST",
        body: JSON.stringify(data),
        skipUnauthorizedHandler: true,
      }),
    );
  },

  logout(): Promise<void> {
    return transition(() =>
      request("/api/v1/auth/logout", decodeEmpty, {
        method: "POST",
        skipUnauthorizedHandler: true,
      }),
    );
  },

  me(): Promise<AuthResponse> {
    return request("/api/v1/auth/me", decodeAuth, {
      skipUnauthorizedHandler: true,
    });
  },
};

export const resourceApi = {
  async search(
    params: ResourceSearchParams,
    signal?: AbortSignal,
  ): Promise<ResourceSearchResult[]> {
    return request(
      `/api/v1/resources/search?${searchQuery(params)}`,
      decodeSearchResults,
      { signal },
    );
  },

  getSaved(signal?: AbortSignal): Promise<SavedResourceResponse[]> {
    return request("/api/v1/resources/saved", decodeSavedResources, { signal });
  },

  save(data: SaveResourceRequest): Promise<SavedResourceResponse> {
    return request("/api/v1/resources/saved", decodeSavedResource, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateNotes(
    id: string,
    data: UpdateNotesRequest,
  ): Promise<SavedResourceResponse> {
    return request(`/api/v1/resources/saved/${id}/notes`, decodeSavedResource, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  unsave(id: string): Promise<void> {
    return request(`/api/v1/resources/saved/${id}`, decodeEmpty, {
      method: "DELETE",
    });
  },
};
