import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import {
  listEntityResolution,
  runEntityResolution,
  type EntityClassification,
  type EntityResolutionResult,
} from "../api/entityResolution.ts";

const CLASSIFICATION_LABELS: Record<EntityClassification, string> = {
  EXACT_MATCH: "Exact Match",
  LIKELY_SAME_ENTITY: "Likely Same Entity",
  POSSIBLE_MISMATCH: "Possible Mismatch",
  STRONG_MISMATCH: "Strong Mismatch",
  INSUFFICIENT_EVIDENCE: "Insufficient Evidence",
};

const SOURCE_LABELS: Record<string, string> = {
  APPLICATION: "Application",
  DOCUMENT: "Document",
  GST_VERIFICATION: "GST Verification",
  UDYAM_VERIFICATION: "Udyam Verification",
  OEM_VERIFICATION: "OEM Verification",
};

function classificationClass(classification: EntityClassification): string {
  if (classification === "EXACT_MATCH" || classification === "LIKELY_SAME_ENTITY") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (classification === "POSSIBLE_MISMATCH") {
    return "bg-amber-50 text-amber-800";
  }
  if (classification === "STRONG_MISMATCH") {
    return "bg-red-50 text-red-800";
  }
  return "bg-slate-100 text-slate-700";
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function fieldLabel(field: string): string {
  if (field === "company_name") {
    return "Company name";
  }
  if (field === "gstin") {
    return "GSTIN";
  }
  if (field === "udyam") {
    return "Udyam";
  }
  if (field === "oem") {
    return "OEM";
  }
  if (field === "pan") {
    return "PAN";
  }
  return field;
}

export function EntityResolutionCenter({
  token,
  applicationId,
}: {
  token: string;
  applicationId: number;
}) {
  const [results, setResults] = useState<EntityResolutionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listEntityResolution(token, applicationId)
      .then((items) => {
        if (!cancelled) {
          setResults(items);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load entity resolution");
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

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const items = await runEntityResolution(token, applicationId);
      setResults(items);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to run entity resolution");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Entity Resolution</h3>
        <button
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          type="button"
          disabled={running}
          onClick={() => void handleRun()}
        >
          {running ? "Running..." : "Run Entity Resolution"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Compares submitted and sandbox-verified values. This is not a compliance decision and does not
        produce PASS/FAIL.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading entity resolution...</p> : null}

      {!loading && results.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No comparisons yet. Run entity resolution after sandbox verification to compare available sources.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {results.map((result) => (
            <li key={result.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{fieldLabel(result.field)}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classificationClass(result.classification)}`}>
                  {CLASSIFICATION_LABELS[result.classification]}
                </span>
              </div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    {sourceLabel(result.sourceA)}
                    {result.sourceA.endsWith("_VERIFICATION") ? " · SANDBOX" : ""}
                  </dt>
                  <dd className="mt-1 text-slate-900">{result.valueA || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                    {sourceLabel(result.sourceB)}
                    {result.sourceB.endsWith("_VERIFICATION") ? " · SANDBOX" : ""}
                  </dt>
                  <dd className="mt-1 text-slate-900">{result.valueB || "—"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-slate-700">{result.reasoning}</p>
              <p className="mt-1 text-xs text-slate-500">
                Comparison confidence: {result.confidence.toFixed(2)}
                {result.sandbox ? " · DEMO / SANDBOX source involved" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
