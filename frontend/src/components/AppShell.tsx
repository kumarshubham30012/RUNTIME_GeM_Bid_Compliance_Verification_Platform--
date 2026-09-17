import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { roleLabel, type PublicUser, type Role } from "../api/auth.ts";
import { useAuth } from "../auth/AuthContext.tsx";

export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  if (state.status !== "authenticated") {
    return null;
  }

  const user: PublicUser = state.user;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">GeM</p>
            <h1 className="text-lg font-semibold text-slate-900">
              Bid Compliance Verification Platform
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">Role: {roleLabel(role)}</p>
            </div>
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
              type="button"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
