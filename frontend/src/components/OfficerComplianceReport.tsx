import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import { listComplianceResults, type ComplianceResult } from "../api/compliance.ts";
import { listEvidenceFindings, type EvidenceFinding } from "../api/evidence.ts";
import { deriveOfficerScore, type OfficerRiskLevel } from "../status/officerScore.ts";

const RISK_LABELS: Record<OfficerRiskLevel, string> = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
};

function riskClass(risk: OfficerRiskLevel): string {
  if (risk === "LOW") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (risk === "MEDIUM") {
    return "bg-amber-50 text-amber-800";
  }
  return "bg-red-50 text-red-800";
}

export function OfficerComplianceReport({
  token,
  applicationId,
}: {
  token: string;
  applicationId: number;
}) {
  const [results, setResults] = useState<ComplianceResult[] | null>(null);
  const [findings, setFindings] = useState<EvidenceFinding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([listComplianceResults(token, applicationId), listEvidenceFindings(token, applicationId)])
      .then(([items, evidence]) => {
        if (!cancelled) {
          setResults(items);
          setFindings(evidence);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setResults(null);
          setFindings([]);
          setError(caught instanceof ApiError ? caught.message : "Unable to load compliance report");
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

  const report = results ? deriveOfficerScore(results) : null;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Officer Compliance Report</h3>
      <p className="mt-2 text-sm text-slate-600">
        Score and risk for this application only, derived from stored Phase 10 compliance results.
        This is not a ranking and does not compare bidders.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading compliance report...</p> : null}

      {!loading && report ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-semibold text-slate-900">
              {report.score === null ? "—" : `${report.score}`}
              <span className="ml-1 text-sm font-medium text-slate-500">/ 100</span>
            </p>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${riskClass(report.risk)}`}>
              {RISK_LABELS[report.risk]} RISK
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-700">
            Formula: (PASS × 1 + REVIEW × 0.5 + PENDING × 0 + FAIL × 0) ÷ applicable requirements ×
            100. NOT_APPLICABLE is excluded. Current points: {report.earnedPoints} /{" "}
            {report.applicableCount} applicable.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            LOW: score ≥ 80 and no FAIL. MEDIUM: score ≥ 60 and at most one FAIL. HIGH: score &lt; 60
            or two or more FAIL.
          </p>

          <h4 className="mt-6 text-sm font-semibold text-slate-900">Requirement counts</h4>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Pass</dt>
              <dd className="mt-1 font-medium text-slate-900">{report.counts.PASS}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Fail</dt>
              <dd className="mt-1 font-medium text-slate-900">{report.counts.FAIL}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Review</dt>
              <dd className="mt-1 font-medium text-slate-900">{report.counts.REVIEW}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Pending</dt>
              <dd className="mt-1 font-medium text-slate-900">{report.counts.PENDING}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Not applicable</dt>
              <dd className="mt-1 font-medium text-slate-900">{report.counts.NOT_APPLICABLE}</dd>
            </div>
          </dl>

          <h4 className="mt-6 text-sm font-semibold text-slate-900">Requirement summary</h4>
          {results && results.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {results.map((result) => (
                <li key={result.id}>
                  {result.requirementName}: {result.status}
                  {result.mandatory ? " (mandatory)" : " (optional)"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No compliance results stored yet.</p>
          )}

          <h4 className="mt-6 text-sm font-semibold text-slate-900">Risk reasons</h4>
          {report.riskReasons.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {report.riskReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-600">No risk reasons from the stored results.</p>
          )}

          <h4 className="mt-6 text-sm font-semibold text-slate-900">Evidence findings</h4>
          {findings.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              No evidence findings stored. Generate evidence below after a compliance check.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {findings.map((finding) => (
                <li key={finding.id}>
                  <span className="font-medium">{finding.requirementName}</span> · {finding.status}:{" "}
                  {finding.reasoning}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
