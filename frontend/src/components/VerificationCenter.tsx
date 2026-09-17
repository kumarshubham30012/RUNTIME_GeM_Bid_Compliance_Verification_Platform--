import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import {
  listVerificationResults,
  runVerification,
  type VerificationResult,
} from "../api/verification.ts";

export type VerificationRequirement = {
  id: number;
  name: string;
  tenderClause: string;
  verificationMethod: string;
};

function statusClassName(status: string): string {
  if (status === "VERIFIED") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (status === "NOT_FOUND") {
    return "bg-amber-50 text-amber-800";
  }
  if (status === "INSUFFICIENT_DATA") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-indigo-50 text-indigo-800";
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function VerificationCenter({
  token,
  applicationId,
  requirements,
}: {
  token: string;
  applicationId: number;
  requirements: VerificationRequirement[];
}) {
  const [results, setResults] = useState<Record<number, VerificationResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listVerificationResults(token, applicationId)
      .then((items) => {
        if (cancelled) {
          return;
        }
        const next: Record<number, VerificationResult> = {};
        for (const item of items) {
          next[item.requirementId] = item;
        }
        setResults(next);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load verification results");
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

  async function handleRun(requirementId: number) {
    setRunningId(requirementId);
    setError(null);
    try {
      const result = await runVerification(token, applicationId, requirementId);
      setResults((current) => ({ ...current, [requirementId]: result }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to run verification");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Verification Center</h3>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-amber-900">
          DEMO / SANDBOX
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Simulated local demo lookups only. These results are not government verification and are not
        a tender compliance decision.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading verification results...</p> : null}

      {requirements.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No requirements are configured for this tender.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {requirements.map((requirement) => {
            const result = results[requirement.id];
            return (
              <li key={requirement.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{requirement.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{requirement.tenderClause}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                      Verification method: {requirement.verificationMethod}
                    </p>
                  </div>
                  <button
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                    type="button"
                    disabled={runningId === requirement.id}
                    onClick={() => void handleRun(requirement.id)}
                  >
                    {runningId === requirement.id ? "Running..." : "Run Verification"}
                  </button>
                </div>

                {result ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">
                        SANDBOX
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClassName(result.status)}`}>
                        Verification status: {result.status}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Provider</dt>
                        <dd className="mt-1 text-slate-900">{result.provider}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Environment</dt>
                        <dd className="mt-1 text-slate-900">{result.environment}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-sm text-slate-700">{result.summary}</p>
                    {Object.keys(result.data).length > 0 ? (
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        {Object.entries(result.data).map(([key, value]) =>
                          key === "documents" ? null : (
                            <div key={key}>
                              <dt className="text-xs uppercase tracking-wide text-slate-500">{key}</dt>
                              <dd className="mt-1 text-slate-900">{displayValue(value)}</dd>
                            </div>
                          )
                        )}
                      </dl>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No sandbox verification has been run yet.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
