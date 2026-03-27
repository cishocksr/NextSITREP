import { clearAuth, getToken } from "./auth";
import type {
  AuthResponse,
  LoginRequest,
  ResourceSearchParams,
  ResourceSearchResult,
  SaveResourceRequest,
  SavedResourceResponse,
  UpdateNotesRequest,
  UserRegistrationRequest,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Unauthorised → clear local session
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
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

  updateNotes(id: string, data: UpdateNotesRequest): Promise<SavedResourceResponse> {
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
