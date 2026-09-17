import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { dashboardPath, type Role } from "../api/auth.ts";
import { useAuth } from "./AuthContext.tsx";

export function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (state.status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  if (state.user.role !== role) {
    return <Navigate to={dashboardPath(state.user.role)} replace />;
  }

  return children;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (state.status === "authenticated") {
    return <Navigate to={dashboardPath(state.user.role)} replace />;
  }

  return children;
}
