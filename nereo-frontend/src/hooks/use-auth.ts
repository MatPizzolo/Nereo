"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export type UserRole = "owner" | "manager" | "employee";

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

/** Decode JWT payload (client-side, no verification) */
function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

function setTokenCookie(name: string, token: string, maxAgeDays: number) {
  document.cookie = `${name}=${token}; path=/; max-age=${maxAgeDays * 86400}; SameSite=Lax`;
}

function deleteTokenCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

function getTokenCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

export function useAuth() {
  const router = useRouter();

  const user = useMemo<User | null>(() => {
    if (typeof window === "undefined") return null;
    const token = getTokenCookie("access_token");
    if (!token) return null;
    const payload = decodeJWT(token);
    if (!payload) return null;
    return {
      id: payload.sub as string,
      tenantId: payload.tid as string,
      email: (payload.email as string) ?? "",
      fullName: (payload.full_name as string) ?? "",
      role: payload.role as UserRole,
    };
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const data = await api.post<AuthResponse>(
        "/api/v1/auth/login",
        credentials
      );
      setTokenCookie("access_token", data.access_token, 1); // 1 day (short-lived)
      setTokenCookie("refresh_token", data.refresh_token, 7);
      // Redirect based on role
      const role = data.user.role;
      router.push(role === "employee" ? "/operario" : "/admin");
      return data.user;
    },
    [router]
  );

  const logout = useCallback(() => {
    deleteTokenCookie("access_token");
    deleteTokenCookie("refresh_token");
    router.push("/login");
  }, [router]);

  const refreshToken = useCallback(async () => {
    const refresh = getTokenCookie("refresh_token");
    if (!refresh) {
      logout();
      return;
    }
    try {
      const data = await api.post<AuthResponse>("/api/v1/auth/refresh", {
        refresh_token: refresh,
      });
      setTokenCookie("access_token", data.access_token, 1);
      setTokenCookie("refresh_token", data.refresh_token, 7);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
      }
    }
  }, [logout]);

  return {
    user,
    isAuthenticated: !!user,
    isOwner: user?.role === "owner",
    isManager: user?.role === "manager" || user?.role === "owner",
    isEmployee: user?.role === "employee",
    login,
    logout,
    refreshToken,
  };
}
