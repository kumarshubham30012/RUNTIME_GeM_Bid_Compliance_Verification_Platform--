import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client.ts";
import { fetchTenderComparison, type TenderComparison } from "../api/comparison.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";
import { BidderComparisonTable } from "../components/BidderComparisonTable.tsx";

export function OfficerTenderComparisonPage() {
  const { id } = useParams();
  const { state } = useAuth();
  const [comparison, setComparison] = useState<TenderComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state.status !== "authenticated" || !id) {
      return;
    }

    const tenderId = Number(id);
    if (!Number.isInteger(tenderId)) {
      setError("Tender id is invalid");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchTenderComparison(state.token, tenderId)
      .then((result) => {
        if (!cancelled) {
          setComparison(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setComparison(null);
          setError(caught instanceof ApiError ? caught.message : "Unable to load comparison");
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
  }, [id, state]);

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <AppShell role="officer">
      <Link className="text-sm text-slate-600 hover:underline" to={id ? `/officer/tenders/${id}` : "/officer"}>
        Back to tender
      </Link>
      <p className="mt-4 text-sm font-medium text-slate-500">Officer comparison</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        {comparison?.tenderTitle ?? "Bidder comparison"}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Per-tender comparison using the same Phase 13 score and risk rules. This view is not shown to
        bidders.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading comparison...</p> : null}

      {!loading && comparison ? (
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <BidderComparisonTable bidders={comparison.bidders} />
        </section>
      ) : null}
    </AppShell>
  );
}
