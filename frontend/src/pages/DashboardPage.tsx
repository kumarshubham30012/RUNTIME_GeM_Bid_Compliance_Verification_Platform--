import { roleLabel, type Role } from "../api/auth.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";

const workspaceCopy: Record<Role, { title: string; heading: string; placeholder: string }> = {
  bidder: {
    title: "Bidder Dashboard",
    heading: "Bidder workspace",
    placeholder: "Bidder tools will appear here in a later phase.",
  },
  officer: {
    title: "Officer Dashboard",
    heading: "Officer workspace",
    placeholder: "Officer tools will appear here in a later phase.",
  },
  admin: {
    title: "Admin Dashboard",
    heading: "Admin workspace",
    placeholder: "Admin tools will appear here in a later phase.",
  },
};

export function DashboardPage({ role }: { role: Role }) {
  const { state } = useAuth();
  const copy = workspaceCopy[role];

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <AppShell role={role}>
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">{copy.title}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Welcome, {state.user.name}
        </h2>
        <p className="mt-2 text-slate-600">Role: {roleLabel(role)}</p>
        <p className="mt-1 text-sm text-slate-500">{state.user.email}</p>

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h3 className="text-lg font-medium text-slate-900">{copy.heading}</h3>
          <p className="mt-2 text-sm text-slate-600">{copy.placeholder}</p>
        </div>
      </section>
    </AppShell>
  );
}
