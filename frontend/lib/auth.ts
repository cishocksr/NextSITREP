import type { AuthResponse } from "./types";

const EXPIRY_KEY = "vc_expiry";
const USER_KEY = "vc_user";

export function saveAuth(auth: AuthResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXPIRY_KEY, (Date.now() + auth.expiresIn).toString());
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      userId: auth.userId,
      email: auth.email,
      firstName: auth.firstName,
      lastName: auth.lastName,
      branchOfService: auth.branchOfService,
      zipCode: auth.zipCode,
    }),
  );
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) {
    clearAuth();
    return null;
  }
  return "cookie-session";
}

export function getStoredUser(): Omit<AuthResponse, "expiresIn"> | null {
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
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
