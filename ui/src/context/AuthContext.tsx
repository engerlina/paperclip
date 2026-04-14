/**
 * DISRO: Auth context to expose session and admin status for role-based UI
 */
import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi, type AuthSession } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";

interface AuthContextValue {
  session: AuthSession | null;
  isInstanceAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isLoading } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });

  const value: AuthContextValue = {
    session: session ?? null,
    isInstanceAdmin: session?.isInstanceAdmin ?? false,
    loading: isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
