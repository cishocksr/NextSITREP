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

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

type ApiRequestOptions = RequestInit & {
  skipUnauthorizedHandler?: boolean;
};

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { skipUnauthorizedHandler = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    credentials: "include",
    headers,
  });

  // Unauthorized/forbidden usually means the token is missing, invalid, or expired.
  if (!skipUnauthorizedHandler && (res.status === 401 || res.status === 403)) {
    onUnauthorized?.();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore parse error
    }
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ─── Auth Endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  register(data: UserRegistrationRequest): Promise<AuthResponse> {
    return request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  login(data: LoginRequest): Promise<AuthResponse> {
    return request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  logout(): Promise<void> {
    return request("/api/v1/auth/logout", {
      method: "POST",
      skipUnauthorizedHandler: true,
    });
  },

  me(): Promise<AuthResponse> {
    return request("/api/v1/auth/me", {
      skipUnauthorizedHandler: true,
    });
  },
};

// ─── Resource Endpoints ───────────────────────────────────────────────────────

export const resourceApi = {
  search(params: ResourceSearchParams): Promise<ResourceSearchResult[]> {
    const qs = new URLSearchParams();
    qs.set("zipCode", params.zipCode);
    if (params.category) qs.set("category", params.category);
    if (params.keyword) qs.set("keyword", params.keyword);
    if (params.radius) qs.set("radius", String(params.radius));
    return request(`/api/v1/resources/search?${qs.toString()}`);
  },

  getSaved(): Promise<SavedResourceResponse[]> {
    return request("/api/v1/resources/saved");
  },

  save(data: SaveResourceRequest): Promise<SavedResourceResponse> {
    return request("/api/v1/resources/saved", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateNotes(
    id: string,
    data: UpdateNotesRequest,
  ): Promise<SavedResourceResponse> {
    return request(`/api/v1/resources/saved/${id}/notes`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  unsave(id: string): Promise<void> {
    return request(`/api/v1/resources/saved/${id}`, {
      method: "DELETE",
    });
  },
};
