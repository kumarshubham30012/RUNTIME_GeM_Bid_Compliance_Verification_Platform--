import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError } from "../api/client.ts";
import { listTenders, type Tender } from "../api/tenders.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";
import { TenderListLink, TenderStatusBadge, placeholderStat } from "../components/tenderDisplay.tsx";

export function OfficerTenderListPage() {
  const { state } = useAuth();
  const location = useLocation();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const successMessage =
    location.state && typeof location.state === "object" && "success" in location.state
      ? String(location.state.success)
      : null;

  useEffect(() => {
    if (state.status !== "authenticated") {
      return;
    }

    let cancelled = false;
    setLoading(true);

    listTenders(state.token)
      .then((result) => {
        if (!cancelled) {
          setTenders(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load tenders");
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

  return (
    <AppShell role="officer">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Officer Dashboard</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Tenders</h2>
        </div>
        <Link
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          to="/officer/tenders/new"
        >
          Create Tender
        </Link>
      </div>

      {successMessage ? (
        <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{successMessage}</p>
      ) : null}

      {error ? <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-6 py-10 text-sm text-slate-600">Loading tenders...</p>
        ) : tenders.length === 0 ? (
          <p className="px-6 py-10 text-sm text-slate-600">No tenders yet. Create one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Opening date</th>
                  <th className="px-4 py-3 font-medium">Closing date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Bidders</th>
                  <th className="px-4 py-3 font-medium">Pending reviews</th>
                  <th className="px-4 py-3 font-medium">Completed reviews</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((tender) => (
                  <tr key={tender.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <TenderListLink tender={tender} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{tender.department}</td>
                    <td className="px-4 py-3 text-slate-700">{tender.openingDate}</td>
                    <td className="px-4 py-3 text-slate-700">{tender.closingDate}</td>
                    <td className="px-4 py-3">
                      <TenderStatusBadge status={tender.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{placeholderStat(tender.bidderCount)}</td>
                    <td className="px-4 py-3 text-slate-500">{placeholderStat(tender.pendingReviews)}</td>
                    <td className="px-4 py-3 text-slate-500">{placeholderStat(tender.completedReviews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
