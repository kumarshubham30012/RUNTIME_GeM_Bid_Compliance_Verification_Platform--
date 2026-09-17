import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import {
  listComplianceResults,
  runComplianceCheck,
  type ComplianceResult,
  type ComplianceStatus,
} from "../api/compliance.ts";

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  PASS: "PASS",
  FAIL: "FAIL",
  REVIEW: "REVIEW",
  NOT_APPLICABLE: "NOT APPLICABLE",
  PENDING: "PENDING",
};

const REASON_MESSAGES: Record<string, string> = {
  REQUIRED_DOCUMENT_PRESENT: "Required document is present.",
  REQUIRED_DOCUMENT_MISSING: "Required document has not been submitted yet.",
  VERIFICATION_PENDING: "Sandbox verification has not been run yet.",
  VERIFICATION_NOT_FOUND: "Sandbox verification did not find a matching record.",
  VERIFICATION_INSUFFICIENT_DATA: "Sandbox verification did not have enough data to evaluate.",
  VERIFICATION_PRESENT: "Sandbox verification produced a result that satisfies this existence rule.",
  EXACT_VALUE_MATCH: "Compared values match after normalization.",
  EXACT_VALUE_MISMATCH: "Compared values differ after normalization.",
  ENTITY_EXACT_MATCH: "Entity resolution classified the compared values as an exact match.",
  ENTITY_LIKELY_SAME: "Entity resolution classified the compared values as likely the same entity.",
  ENTITY_POSSIBLE_MISMATCH: "Entity resolution classified the compared values as a possible mismatch.",
  ENTITY_STRONG_MISMATCH: "Entity resolution classified the compared values as a strong mismatch.",
  ENTITY_INSUFFICIENT_EVIDENCE: "Entity resolution did not have enough evidence to compare.",
  MANUAL_REVIEW_REQUIRED: "This requirement is configured for officer review.",
  UNSUPPORTED_RULE_TYPE: "This requirement uses an unsupported rule type.",
  UNSUPPORTED_VERIFICATION_METHOD: "This requirement uses an unsupported verification method.",
};

function statusClass(status: ComplianceStatus): string {
  if (status === "PASS") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (status === "FAIL") {
    return "bg-red-50 text-red-800";
  }
  if (status === "REVIEW") {
    return "bg-amber-50 text-amber-800";
  }
  if (status === "PENDING") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-sky-50 text-sky-800";
}

function reasonMessage(reasonCode: string): string {
  return REASON_MESSAGES[reasonCode] ?? reasonCode.replaceAll("_", " ");
}

export function ComplianceResults({
  token,
  applicationId,
}: {
  token: string;
  applicationId: number;
}) {
  const [results, setResults] = useState<ComplianceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

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
          setError(caught instanceof ApiError ? caught.message : "Unable to load compliance results");
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
      const items = await runComplianceCheck(token, applicationId);
      setResults(items);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to run compliance check");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Compliance Results</h3>
        <button
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          type="button"
          disabled={running}
          onClick={() => void handleRun()}
        >
          {running ? "Running..." : "Run Compliance Check"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Requirement-level results from the server-side rules engine. This panel does not score
        bidders, assign risk, or decide award.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading compliance results...</p> : null}

      {!loading && results.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No compliance results yet. Run a compliance check after verification and entity resolution.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {results.map((result) => (
            <li key={result.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{result.requirementName}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(result.status)}`}>
                  {STATUS_LABELS[result.status]}
                </span>
              </div>
              {result.tenderClause ? (
                <p className="mt-1 text-sm text-slate-600">{result.tenderClause}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                {result.mandatory ? "MANDATORY" : "OPTIONAL"} · {result.verificationMethod} ·{" "}
                {result.ruleType}
              </p>
              <p className="mt-3 text-sm text-slate-700">{reasonMessage(result.reasonCode)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {result.reasonCode}
                {result.sandbox ? " · DEMO / SANDBOX verification involved" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
