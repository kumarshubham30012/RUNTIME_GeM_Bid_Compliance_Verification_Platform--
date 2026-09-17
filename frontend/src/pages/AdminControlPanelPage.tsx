import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../api/client.ts";
import type { PublicUser } from "../api/auth.ts";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminTenders,
  listAdminUsers,
  listSandboxGst,
  updateSandboxGst,
  type AdminTenderRow,
  type SandboxGstRecord,
} from "../api/admin.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";

export function AdminControlPanelPage() {
  const { state } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [tenders, setTenders] = useState<AdminTenderRow[]>([]);
  const [gstRecords, setGstRecords] = useState<SandboxGstRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"officer" | "admin">("officer");
  const [saving, setSaving] = useState(false);

  async function load(token: string) {
    const [userList, tenderList, gstList] = await Promise.all([
      listAdminUsers(token),
      listAdminTenders(token),
      listSandboxGst(token),
    ]);
    setUsers(userList);
    setTenders(tenderList);
    setGstRecords(gstList);
  }

  useEffect(() => {
    if (state.status !== "authenticated") {
      return;
    }

    let cancelled = false;
    setLoading(true);
    load(state.token)
      .then(() => {
        if (!cancelled) {
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load admin panel");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state]);

  if (state.status !== "authenticated") {
    return null;
  }

  const token = state.token;
  const currentUserId = state.user.id;

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await createAdminUser(token, { email, password, fullName, role });
      setEmail("");
      setPassword("");
      setFullName("");
      setNotice(`${role} account created.`);
      await load(token);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to create account");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(user: PublicUser) {
    setError(null);
    setNotice(null);
    try {
      await deleteAdminUser(token, user.id);
      setNotice(`${user.email} removed.`);
      await load(token);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to remove account");
    }
  }

  async function handleGstSave(record: SandboxGstRecord) {
    setError(null);
    setNotice(null);
    try {
      await updateSandboxGst(token, record.gstin, {
        legalName: record.legalName,
        registrationStatus: record.registrationStatus,
        state: record.state,
      });
      setNotice(`Sandbox GST ${record.gstin} updated. The next GST verification will use this record.`);
      await load(token);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to update sandbox GST");
    }
  }

  return (
    <AppShell role="admin">
      <p className="text-sm font-medium text-slate-500">Admin Control Panel</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Administration</h2>
      <p className="mt-2 text-sm text-slate-600">
        Manage staff accounts, inspect tenders across officers, and edit local SANDBOX GST demo
        records. This is not a government GST system.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading admin panel...</p> : null}

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Users</h3>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void handleCreate(event)}>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={role}
            onChange={(event) => setRole(event.target.value as "officer" | "admin")}
          >
            <option value="officer">Officer</option>
            <option value="admin">Admin</option>
          </select>
          <button
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 sm:col-span-2"
            type="submit"
            disabled={saving}
          >
            {saving ? "Creating..." : "Create account"}
          </button>
        </form>
        <ul className="mt-6 divide-y divide-slate-100">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <span>
                <span className="font-medium text-slate-900">{user.name}</span> · {user.email} · {user.role}
              </span>
              {user.role !== "bidder" && user.id !== currentUserId ? (
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1 text-slate-700"
                  type="button"
                  onClick={() => void handleRemove(user)}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-8 pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Tenders across officers</h3>
          <p className="mt-1 text-sm text-slate-600">Oversight only. No bidder ranking or comparison.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Officer</th>
                <th className="px-4 py-3 font-medium">Tender</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Applications</th>
              </tr>
            </thead>
            <tbody>
              {tenders.map((tender) => (
                <tr key={tender.tenderId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-800">
                    {tender.officerName}
                    <span className="block text-xs text-slate-500">{tender.officerEmail}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-900">{tender.title}</td>
                  <td className="px-4 py-3 text-slate-700">{tender.department}</td>
                  <td className="px-4 py-3 text-slate-700">{tender.status}</td>
                  <td className="px-4 py-3 text-slate-700">{tender.applicationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Sandbox GST records</h3>
        <p className="mt-1 text-sm text-slate-600">
          Local demo registry only. Edits affect the next SANDBOX GST verification.
        </p>
        <ul className="mt-4 space-y-4">
          {gstRecords.map((record, index) => (
            <li key={record.gstin} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-900">{record.gstin}</p>
              <label className="mt-2 block text-xs text-slate-500">
                Legal name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={record.legalName}
                  onChange={(event) => {
                    const next = [...gstRecords];
                    next[index] = { ...record, legalName: event.target.value };
                    setGstRecords(next);
                  }}
                />
              </label>
              <label className="mt-2 block text-xs text-slate-500">
                Registration status
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={record.registrationStatus}
                  onChange={(event) => {
                    const next = [...gstRecords];
                    next[index] = { ...record, registrationStatus: event.target.value };
                    setGstRecords(next);
                  }}
                />
              </label>
              <label className="mt-2 block text-xs text-slate-500">
                State
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={record.state}
                  onChange={(event) => {
                    const next = [...gstRecords];
                    next[index] = { ...record, state: event.target.value };
                    setGstRecords(next);
                  }}
                />
              </label>
              <button
                className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                type="button"
                onClick={() => void handleGstSave(record)}
              >
                Save GST record
              </button>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
