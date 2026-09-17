import { createContext, useContext, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client.ts";
import { fetchCurrentUser, login as loginRequest, type PublicUser } from "../api/auth.ts";

const TOKEN_STORAGE_KEY = "gem_auth_token";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; token: string; user: PublicUser };

type AuthContextValue = {
  state: AuthState;
  login: (email: string, password: string) => Promise<PublicUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setState({ status: "unauthenticated" });
      return;
    }

    let cancelled = false;

    fetchCurrentUser(token)
      .then((user) => {
        if (!cancelled) {
          setState({ status: "authenticated", token, user });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          }
          setState({ status: "unauthenticated" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setState({ status: "authenticated", token: result.token, user: result.user });
    return result.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setState({ status: "unauthenticated" });
  }, []);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
