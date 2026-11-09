export const SESSION_EVENT_KEY = "vc_session_event";

/** Discard legacy caches. Only /me verifies the HttpOnly cookie session. */
export function clearAuth(): void {
  if (typeof window === "undefined") return;
  for (const key of ["vc_user", "vc_expiry", "vc_token"]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Optional storage must not break the cookie session.
    }
  }
}

/** Notify tabs without persisting identity, tokens, or an estimated expiry. */
export function notifySessionChange(): void {
  try {
    localStorage.setItem(SESSION_EVENT_KEY, crypto.randomUUID());
  } catch {
    // Focus, visibility and periodic checks also reconcile the session.
  }
}
