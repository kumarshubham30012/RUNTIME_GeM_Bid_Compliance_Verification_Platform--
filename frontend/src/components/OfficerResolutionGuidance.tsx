import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import {
  listResolutions,
  markResolved,
  requestClarification,
  type FindingResolution,
  type ResolutionStatus,
} from "../api/resolution.ts";

function statusClass(status: ResolutionStatus): string {
  if (status === "RESOLVED") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (status === "CLARIFICATION_REQUESTED") {
    return "bg-amber-50 text-amber-800";
  }
  return "bg-slate-100 text-slate-700";
}

export function OfficerResolutionGuidance({
  token,
  applicationId,
}: {
  token: string;
  applicationId: number;
}) {
  const [items, setItems] = useState<FindingResolution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listResolutions(token, applicationId)
      .then((result) => {
        if (!cancelled) {
          setItems(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load resolution guidance");
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

  async function runAction(findingId: number, action: "clarify" | "resolve") {
    setPendingId(findingId);
    setError(null);
    try {
      const result =
        action === "clarify"
          ? await requestClarification(token, applicationId, findingId)
          : await markResolved(token, applicationId, findingId);
      setItems(result);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to update resolution");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Resolution Guidance</h3>
      <p className="mt-2 text-sm text-slate-600">
        Officer-only next steps for non-PASS evidence findings. Guidance is derived from stored
        compliance and evidence data.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading resolution guidance...</p> : null}

      {!loading && items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No evidence findings to resolve. Generate evidence after a compliance check.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((item) => (
            <li key={item.findingId} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{item.requirementName}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item.resolutionStatus)}`}>
                  {item.resolutionStatus.replaceAll("_", " ")}
                </span>
              </div>
              {item.tenderClause ? <p className="mt-1 text-sm text-slate-600">{item.tenderClause}</p> : null}
              <p className="mt-1 text-xs text-slate-500">Compliance: {item.complianceStatus}</p>
              <dl className="mt-3 space-y-2 text-sm text-slate-700">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">What happened</dt>
                  <dd className="mt-1">{item.guidance.whatHappened}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Why it is an issue</dt>
                  <dd className="mt-1">{item.guidance.whyIssue}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Evidence used</dt>
                  <dd className="mt-1">{item.guidance.evidenceUsed}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Verify next</dt>
                  <dd className="mt-1">{item.guidance.nextVerify}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-60"
                  type="button"
                  disabled={pendingId === item.findingId}
                  onClick={() => void runAction(item.findingId, "clarify")}
                >
                  Request Clarification
                </button>
                <button
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  type="button"
                  disabled={pendingId === item.findingId}
                  onClick={() => void runAction(item.findingId, "resolve")}
                >
                  Mark Resolved
                </button>
              </div>
              {item.history.length > 0 ? (
                <ol className="mt-4 space-y-1 text-xs text-slate-500">
                  {item.history.map((entry) => (
                    <li key={entry.id}>
                      {entry.createdAt} · {entry.action.replaceAll("_", " ")} · {entry.previousStatus} →{" "}
                      {entry.newStatus} · officer #{entry.officerUserId}
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
