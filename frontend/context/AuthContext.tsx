"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ApiError,
  authApi,
  invalidateSessionRequests,
  setOnUnauthorized,
} from "@/lib/api";
import { clearAuth, notifySessionChange, SESSION_EVENT_KEY } from "@/lib/auth";
import type {
  AuthResponse,
  LoginRequest,
  UserRegistrationRequest,
} from "@/lib/types";

type AuthUser = Omit<AuthResponse, "expiresIn">;
type SessionIssue = { kind: "verification" | "logout"; message: string };
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSigningOut: boolean;
  sessionIssue: SessionIssue | null;
  retrySession: () => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: UserRegistrationRequest) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [sessionIssue, setSessionIssue] = useState<SessionIssue | null>(null);
  const versionRef = useRef(0);
  const mountedRef = useRef(false);
  const pendingRef = useRef(0);
  const logoutUnconfirmedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const setSessionUser = useCallback((auth: AuthResponse | null) => {
    const nextId = auth?.userId ?? null;
    if (userIdRef.current !== nextId) invalidateSessionRequests();
    userIdRef.current = nextId;
    setUser(
      auth
        ? {
            userId: auth.userId,
            email: auth.email,
            firstName: auth.firstName,
            lastName: auth.lastName,
            branchOfService: auth.branchOfService,
            zipCode: auth.zipCode,
          }
        : null,
    );
  }, []);

  const refreshSession = useCallback(async () => {
    if (pendingRef.current || logoutUnconfirmedRef.current) return;
    const version = ++versionRef.current;
    try {
      const auth = await authApi.me();
      if (!mountedRef.current || version !== versionRef.current) return;
      setSessionUser(auth);
      setSessionIssue(null);
    } catch (error) {
      if (!mountedRef.current || version !== versionRef.current) return;
      setSessionUser(null);
      if (error instanceof ApiError && error.status === 401) {
        setSessionIssue(null);
      } else {
        setSessionIssue({
          kind: "verification",
          message:
            "We could not verify your session. Check your connection and try again.",
        });
      }
    } finally {
      if (mountedRef.current && version === versionRef.current)
        setIsLoading(false);
    }
  }, [setSessionUser]);

  const handleUnauthorized = useCallback(() => {
    if (pendingRef.current || logoutUnconfirmedRef.current) return;
    versionRef.current += 1;
    invalidateSessionRequests();
    clearAuth();
    setSessionUser(null);
    setIsLoading(false);
    setSessionIssue(null);
    router.replace("/login");
  }, [router, setSessionUser]);

  useEffect(() => {
    mountedRef.current = true;
    clearAuth();
    const unsubscribe = setOnUnauthorized(handleUnauthorized);
    void refreshSession();
    const onFocus = () => {
      void refreshSession();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_EVENT_KEY && event.key !== null) return;
      invalidateSessionRequests();
      setSessionUser(null);
      onFocus();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    // /me currently reports configured lifetime, not remaining JWT lifetime.
    // Reverify the cookie instead of extending a guessed local expiry on reload.
    const timer = setInterval(onVisibility, 60_000);
    return () => {
      mountedRef.current = false;
      versionRef.current += 1;
      unsubscribe?.();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timer);
    };
  }, [handleUnauthorized, refreshSession, setSessionUser]);

  const authenticate = useCallback(
    async (operation: () => Promise<AuthResponse>) => {
      const version = ++versionRef.current;
      pendingRef.current += 1;
      if (!logoutUnconfirmedRef.current) setSessionIssue(null);
      try {
        const auth = await operation();
        if (!mountedRef.current || version !== versionRef.current) return;
        logoutUnconfirmedRef.current = false;
        setSessionIssue(null);
        clearAuth();
        setSessionUser(auth);
        notifySessionChange();
        router.push("/dashboard");
      } catch (error) {
        if (
          mountedRef.current &&
          version === versionRef.current &&
          logoutUnconfirmedRef.current
        ) {
          setSessionIssue({
            kind: "logout",
            message:
              "Sign-out could not be confirmed. Try again before leaving this device.",
          });
        }
        throw error;
      } finally {
        pendingRef.current -= 1;
        if (mountedRef.current && version === versionRef.current) {
          setIsLoading(false);
          setIsSigningOut(false);
        }
      }
    },
    [router, setSessionUser],
  );

  const login = useCallback(
    (data: LoginRequest) => authenticate(() => authApi.login(data)),
    [authenticate],
  );
  const register = useCallback(
    (data: UserRegistrationRequest) =>
      authenticate(() => authApi.register(data)),
    [authenticate],
  );

  const logout = useCallback(async () => {
    const version = ++versionRef.current;
    pendingRef.current += 1;
    logoutUnconfirmedRef.current = true;
    clearAuth();
    setSessionUser(null);
    setIsLoading(false);
    setIsSigningOut(true);
    setSessionIssue(null);
    router.push("/");
    try {
      await authApi.logout();
      logoutUnconfirmedRef.current = false;
      if (!mountedRef.current || version !== versionRef.current) return;
      notifySessionChange();
    } catch {
      if (mountedRef.current && version === versionRef.current) {
        setSessionIssue({
          kind: "logout",
          message:
            "Sign-out could not be confirmed. Try again before leaving this device.",
        });
      }
    } finally {
      pendingRef.current -= 1;
      if (mountedRef.current && version === versionRef.current)
        setIsSigningOut(false);
    }
  }, [router, setSessionUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isSigningOut,
        sessionIssue,
        retrySession: refreshSession,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
