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
import { authApi, setOnUnauthorized } from "@/lib/api";
import { clearAuth, getStoredUser, getToken, saveAuth } from "@/lib/auth";
import type {
  AuthResponse,
  BranchOfService,
  LoginRequest,
  UserRegistrationRequest,
} from "@/lib/types";

interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  branchOfService: BranchOfService;
  zipCode: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: UserRegistrationRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authVersionRef = useRef(0);

  const logout = useCallback(() => {
    authVersionRef.current += 1;
    void authApi.logout().catch(() => {
      // Local cleanup still happens even if the server is unreachable.
    });
    clearAuth();
    setUser(null);
    router.push("/");
  }, [router]);

  const handleAuthResponse = useCallback(
    (auth: AuthResponse, persist = true) => {
      if (persist) {
        saveAuth(auth);
      }
      setUser({
        userId: auth.userId,
        email: auth.email,
        firstName: auth.firstName,
        lastName: auth.lastName,
        branchOfService: auth.branchOfService,
        zipCode: auth.zipCode,
      });
    },
    [],
  );

  // Rehydrate from the HttpOnly cookie on mount.
  useEffect(() => {
    let isMounted = true;
    const loadVersion = authVersionRef.current;
    setOnUnauthorized(logout);

    async function loadSession() {
      const stored = getStoredUser();
      if (getToken() && stored) {
        setUser(stored);
      }

      try {
        const auth = await authApi.me();
        if (!isMounted || loadVersion !== authVersionRef.current) return;
        handleAuthResponse(auth, false);
      } catch {
        if (!isMounted || loadVersion !== authVersionRef.current) return;
        clearAuth();
        setUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [handleAuthResponse, logout]);

  // Proactive expiry timer — log out when the token actually expires
  useEffect(() => {
    if (!user) return;
    const expiry = localStorage.getItem("vc_expiry");
    if (!expiry) return;
    const ms = parseInt(expiry, 10) - Date.now();
    if (ms <= 0) return;
    const timer = setTimeout(logout, ms);
    return () => clearTimeout(timer);
  }, [user, logout]);

  const login = useCallback(
    async (data: LoginRequest) => {
      const auth = await authApi.login(data);
      authVersionRef.current += 1;
      handleAuthResponse(auth);
      router.push("/dashboard");
    },
    [handleAuthResponse, router],
  );

  const register = useCallback(
    async (data: UserRegistrationRequest) => {
      const auth = await authApi.register(data);
      authVersionRef.current += 1;
      handleAuthResponse(auth);
      router.push("/dashboard");
    },
    [handleAuthResponse, router],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
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
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
