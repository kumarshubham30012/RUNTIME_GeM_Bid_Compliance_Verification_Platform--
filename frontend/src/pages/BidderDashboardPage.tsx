import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client.ts";
import { listOpenTenders, startApplication, type BidderTender } from "../api/bidder.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";
import { TenderStatusBadge } from "../components/tenderDisplay.tsx";

export function BidderDashboardPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<BidderTender[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    if (state.status !== "authenticated") {
      return;
    }

    let cancelled = false;
    setLoading(true);

    listOpenTenders(state.token)
      .then((result) => {
        if (!cancelled) {
          setTenders(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load open tenders");
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

  async function handleStart(tender: BidderTender) {
    if (state.status !== "authenticated") {
      return;
    }

    setStartingId(tender.id);
    setError(null);

    try {
      const application = await startApplication(state.token, tender.id);
      navigate(`/bidder/applications/${application.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to start application");
    } finally {
      setStartingId(null);
    }
  }

  function handleContinue(tender: BidderTender) {
    if (tender.applicationId) {
      navigate(`/bidder/applications/${tender.applicationId}`);
    }
  }

  return (
    <AppShell role="bidder">
      <p className="text-sm font-medium text-slate-500">Bidder Dashboard</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Open Tenders</h2>
      <p className="mt-2 text-sm text-slate-600">Welcome, {state.user.name}</p>

      {error ? <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-6 py-10 text-sm text-slate-600">Loading open tenders...</p>
        ) : tenders.length === 0 ? (
          <p className="px-6 py-10 text-sm text-slate-600">
            No open tenders are available right now.
          </p>
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
                  <th className="px-4 py-3 font-medium">Application</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {tenders.map((tender) => (
                  <tr key={tender.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{tender.title}</td>
                    <td className="px-4 py-3 text-slate-700">{tender.department}</td>
                    <td className="px-4 py-3 text-slate-700">{tender.openingDate}</td>
                    <td className="px-4 py-3 text-slate-700">{tender.closingDate}</td>
                    <td className="px-4 py-3">
                      <TenderStatusBadge status={tender.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {tender.applicationStatus ?? "Not started"}
                    </td>
                    <td className="px-4 py-3">
                      {tender.applicationId ? (
                        <button
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                          type="button"
                          onClick={() => handleContinue(tender)}
                        >
                          Continue Application
                        </button>
                      ) : (
                        <button
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                          type="button"
                          disabled={startingId === tender.id}
                          onClick={() => void handleStart(tender)}
                        >
                          {startingId === tender.id ? "Starting..." : "Start Application"}
                        </button>
                      )}
                    </td>
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
