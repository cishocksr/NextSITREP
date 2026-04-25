import type { AuthResponse } from "./types";

const EXPIRY_KEY = "vc_expiry";
const TOKEN_KEY = "vc_token";
const USER_KEY = "vc_user";


export function saveAuth(auth: AuthResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(EXPIRY_KEY, (Date.now() + auth.expiresIn).toString());
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      userId: auth.userId,
      email: auth.email,
      firstName: auth.firstName,
      lastName: auth.lastName,
      branchOfService: auth.branchOfService,
    })
  );
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry)) {
    clearAuth();
    return null;
  }
  return token;
}

export function getStoredUser(): Omit<
  AuthResponse,
  "token" | "tokenType" | "expiresIn"
> | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
