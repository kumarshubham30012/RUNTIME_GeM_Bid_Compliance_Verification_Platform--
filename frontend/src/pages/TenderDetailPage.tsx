import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client.ts";
import { getTender, type Tender } from "../api/tenders.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";
import { TenderMeta, TenderStatusBadge, placeholderStat } from "../components/tenderDisplay.tsx";

export function TenderDetailPage() {
  const { id } = useParams();
  const { state } = useAuth();
  const [tender, setTender] = useState<Tender | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== "authenticated" || !id) {
      return;
    }

    const tenderId = Number(id);
    if (!Number.isInteger(tenderId)) {
      setError("Tender id is invalid");
      return;
    }

    let cancelled = false;

    getTender(state.token, tenderId)
      .then((result) => {
        if (!cancelled) {
          setTender(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load tender");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, state]);

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <AppShell role="officer">
      <Link className="text-sm text-slate-600 hover:underline" to="/officer">
        Back to tenders
      </Link>
      <p className="mt-4 text-sm font-medium text-slate-500">Tender details</p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {tender ? (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{tender.title}</h2>
            <TenderStatusBadge status={tender.status} />
          </div>

          <div className="mt-8">
            <TenderMeta tender={tender} />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Bidders" value={placeholderStat(tender.bidderCount)} />
            <StatCard label="Pending reviews" value={placeholderStat(tender.pendingReviews)} />
            <StatCard label="Completed reviews" value={placeholderStat(tender.completedReviews)} />
          </div>

          <p className="mt-6 text-sm text-slate-500">
            Created by {tender.createdByName} ({tender.createdByEmail}) on {tender.createdAt}
          </p>

          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <h3 className="text-lg font-medium text-slate-900">Later phases</h3>
            <p className="mt-2 text-sm text-slate-600">
              Requirements and bidder data will be added in later phases.
            </p>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}
