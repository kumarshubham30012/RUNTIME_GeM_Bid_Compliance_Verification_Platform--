import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import { listComplianceResults, type ComplianceResult } from "../api/compliance.ts";
import { deriveOverallBidderStatus, type OverallBidderStatus } from "../status/overallStatus.ts";

const STATUS_LABELS: Record<OverallBidderStatus, string> = {
  QUALIFIED: "Qualified",
  NEEDS_MORE_WORK: "Needs More Work",
  UNDER_REVIEW: "Under Review",
};

function statusClass(status: OverallBidderStatus): string {
  if (status === "QUALIFIED") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (status === "NEEDS_MORE_WORK") {
    return "bg-red-50 text-red-800";
  }
  return "bg-amber-50 text-amber-800";
}

export function BidderStatusView({
  token,
  applicationId,
}: {
  token: string;
  applicationId: number;
}) {
  const [results, setResults] = useState<ComplianceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listComplianceResults(token, applicationId)
      .then((items) => {
        if (!cancelled) {
          setResults(items);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setResults(null);
          setError(caught instanceof ApiError ? caught.message : "Unable to load application status");
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
  }, [applicationId, token]);

  const overall = results ? deriveOverallBidderStatus(results) : null;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Application Status</h3>
      <p className="mt-2 text-sm text-slate-600">
        Overall status for this application only, derived from stored compliance results. It is not a
        score, ranking, or comparison with other bidders.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading application status...</p> : null}

      {!loading && overall ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusClass(overall.status)}`}>
              {STATUS_LABELS[overall.status]}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{overall.status}</span>
          </div>
          <p className="mt-3 text-sm text-slate-700">{overall.explanation}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Pass</dt>
              <dd className="mt-1 font-medium text-slate-900">{overall.counts.PASS}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Fail</dt>
              <dd className="mt-1 font-medium text-slate-900">{overall.counts.FAIL}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Review</dt>
              <dd className="mt-1 font-medium text-slate-900">{overall.counts.REVIEW}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Pending</dt>
              <dd className="mt-1 font-medium text-slate-900">{overall.counts.PENDING}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Not applicable</dt>
              <dd className="mt-1 font-medium text-slate-900">{overall.counts.NOT_APPLICABLE}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </section>
  );
}
