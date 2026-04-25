"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    router.push("/");
  }, [router]);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (token && stored) {
      setUser(stored);
    }
    setIsLoading(false);
    setOnUnauthorized(logout);
  }, [logout]);

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

  const handleAuthResponse = useCallback((auth: AuthResponse) => {
    saveAuth(auth);
    setUser({
      userId: auth.userId,
      email: auth.email,
      firstName: auth.firstName,
      lastName: auth.lastName,
      branchOfService: auth.branchOfService,
    });
  }, []);

  const login = useCallback(
    async (data: LoginRequest) => {
      const auth = await authApi.login(data);
      handleAuthResponse(auth);
      router.push("/resources");
    },
    [handleAuthResponse, router],
  );

  const register = useCallback(
    async (data: UserRegistrationRequest) => {
      const auth = await authApi.register(data);
      handleAuthResponse(auth);
      router.push("/resources");
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
