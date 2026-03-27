"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { clearAuth, getStoredUser, saveAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
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

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
    }
    setIsLoading(false);
  }, []);

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
    [handleAuthResponse, router]
  );

  const register = useCallback(
    async (data: UserRegistrationRequest) => {
      const auth = await authApi.register(data);
      handleAuthResponse(auth);
      router.push("/resources");
    },
    [handleAuthResponse, router]
  );

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    router.push("/");
  }, [router]);

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
