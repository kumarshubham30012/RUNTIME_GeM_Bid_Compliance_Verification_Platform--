import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import type { ComplianceStatus } from "../api/compliance.ts";
import {
  generateEvidenceFindings,
  listEvidenceFindings,
  type EvidenceFinding,
} from "../api/evidence.ts";

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  PASS: "PASS",
  FAIL: "FAIL",
  REVIEW: "REVIEW",
  NOT_APPLICABLE: "NOT APPLICABLE",
  PENDING: "PENDING",
};

function statusClass(status: ComplianceStatus): string {
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

export function EvidenceFindings({
  token,
  applicationId,
}: {
  token: string;
  applicationId: number;
}) {
  const [findings, setFindings] = useState<EvidenceFinding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listEvidenceFindings(token, applicationId)
      .then((items) => {
        if (!cancelled) {
          setFindings(items);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load evidence findings");
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

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const items = await generateEvidenceFindings(token, applicationId);
      setFindings(items);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to generate evidence findings");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Evidence Findings</h3>
        <button
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          type="button"
          disabled={generating}
          onClick={() => void handleGenerate()}
        >
          {generating ? "Generating..." : "Generate Evidence"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Plain-English findings for non-PASS compliance results, built from stored documents,
        sandbox verification, and entity resolution. No new evidence is invented.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading evidence findings...</p> : null}

      {!loading && findings.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No findings yet. Generate evidence after a compliance check. PASS results do not create
          findings.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {findings.map((finding) => (
            <li key={finding.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{finding.requirementName}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(finding.status)}`}>
                  {STATUS_LABELS[finding.status]}
                </span>
              </div>
              {finding.tenderClause ? (
                <p className="mt-1 text-sm text-slate-600">{finding.tenderClause}</p>
              ) : null}
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Submitted value</dt>
                  <dd className="mt-1 text-slate-900">{finding.submittedValue || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Verified value</dt>
                  <dd className="mt-1 text-slate-900">{finding.verifiedValue || "—"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm text-slate-700">{finding.reasoning}</p>
              {finding.evidenceSources ? (
                <p className="mt-2 text-xs text-slate-500">Sources: {finding.evidenceSources}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
