import { Navigate } from "react-router-dom";
import { dashboardPath } from "../api/auth.ts";
import { useAuth } from "../auth/AuthContext.tsx";

export function HomeRedirect() {
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

  return <Navigate to="/login" replace />;
}
