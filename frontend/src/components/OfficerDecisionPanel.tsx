import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import {
  getOfficerDecision,
  OFFICER_DECISIONS,
  saveOfficerDecision,
  type OfficerDecision,
  type OfficerDecisionType,
} from "../api/decision.ts";

const DECISION_LABELS: Record<OfficerDecisionType, string> = {
  APPROVE: "Approve",
  REJECT: "Reject",
  REQUEST_CLARIFICATION: "Request clarification",
  KEEP_UNDER_REVIEW: "Keep under review",
};

export function OfficerDecisionPanel({
  token,
  applicationId,
}: {
  token: string;
  applicationId: number;
}) {
  const [current, setCurrent] = useState<OfficerDecision | null>(null);
  const [decision, setDecision] = useState<OfficerDecisionType>("KEEP_UNDER_REVIEW");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getOfficerDecision(token, applicationId)
      .then((stored) => {
        if (!cancelled) {
          setCurrent(stored);
          if (stored) {
            setDecision(stored.decision);
            setReason(stored.reason);
          }
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load officer decision");
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

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const stored = await saveOfficerDecision(token, applicationId, decision, reason);
      setCurrent(stored);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to save officer decision");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Officer Decision</h3>
      <p className="mt-2 text-sm text-slate-600">
        This is the officer&apos;s independent decision. It is not set automatically by the
        compliance score, evidence engine, or any AI recommendation.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading officer decision...</p> : null}

      {!loading ? (
        <>
          <p className="mt-4 text-sm text-slate-700">
            Current decision:{" "}
            <span className="font-medium">
              {current ? DECISION_LABELS[current.decision] : "None recorded"}
            </span>
          </p>
          <fieldset className="mt-4 space-y-2">
            <legend className="text-xs uppercase tracking-wide text-slate-500">Record a decision</legend>
            {OFFICER_DECISIONS.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="radio"
                  name="officer-decision"
                  value={option}
                  checked={decision === option}
                  onChange={() => setDecision(option)}
                />
                {DECISION_LABELS[option]}
              </label>
            ))}
          </fieldset>
          <label className="mt-4 block text-sm text-slate-700">
            Reason (optional)
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button
            className="mt-4 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving..." : "Save officer decision"}
          </button>
        </>
      ) : null}
    </section>
  );
}
