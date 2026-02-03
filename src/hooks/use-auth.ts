"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface Admin {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isLoading: boolean;
}

const TOKEN_KEY = "admin_token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function useAuthToken(): string | null {
  // Initialize with stored token directly to avoid race condition
  // where queries fire before useEffect sets the token
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    setToken(getStoredToken());
  }, []);

  return token;
}

export function useCurrentAdmin() {
  const token = useAuthToken();

  return useQuery<Admin | null>({
    queryKey: ["currentAdmin"],
    queryFn: async () => {
      const storedToken = getStoredToken();
      if (!storedToken) return null;

      const res = await fetch("/api/admin/auth/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (!res.ok) {
        setStoredToken(null);
        return null;
      }

      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: token !== null,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      // Step 1: Login and get token
      const loginRes = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        const error = await loginRes.json();
        throw new Error(error.error || "Login failed");
      }

      const { token, admin } = await loginRes.json();

      // Step 2: Set the httpOnly cookie
      const sessionRes = await fetch("/api/admin/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!sessionRes.ok) {
        throw new Error("Failed to create session");
      }

      // Step 3: Store token in localStorage for API calls
      setStoredToken(token);

      return { token, admin };
    },
    onSuccess: ({ admin }) => {
      queryClient.setQueryData(["currentAdmin"], admin);
      router.push("/admin");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      // Clear the httpOnly cookie
      await fetch("/api/admin/auth/session", {
        method: "DELETE",
      });

      // Clear localStorage
      setStoredToken(null);
    },
    onSuccess: () => {
      queryClient.clear();
      router.push("/admin-login");
    },
  });
}

export function useAuth(): AuthState {
  const { data: admin, isLoading } = useCurrentAdmin();
  const token = useAuthToken();

  return {
    token,
    admin: admin || null,
    isLoading,
  };
}
