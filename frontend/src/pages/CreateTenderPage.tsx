import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client.ts";
import { createTender } from "../api/tenders.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";

export function CreateTenderPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [openingDate, setOpeningDate] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state.status !== "authenticated") {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "authenticated") {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const tender = await createTender(state.token, {
        title,
        department,
        openingDate,
        closingDate,
      });
      navigate("/officer", {
        replace: true,
        state: { success: `Tender "${tender.title}" was created.` },
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
      } else {
        setError("Unable to create tender.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell role="officer">
      <p className="text-sm font-medium text-slate-500">Officer Dashboard</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Create Tender</h2>

      <form className="mt-8 max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Tender title</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Department</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Opening date</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            type="date"
            value={openingDate}
            onChange={(event) => setOpeningDate(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Closing date</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            type="date"
            value={closingDate}
            onChange={(event) => setClosingDate(event.target.value)}
            required
          />
        </label>

        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="flex items-center gap-3">
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create tender"}
          </button>
          <Link className="text-sm text-slate-600 hover:underline" to="/officer">
            Cancel
          </Link>
        </div>
      </form>
    </AppShell>
  );
}
