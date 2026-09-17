import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client.ts";
import {
  getApplication,
  getOpenTender,
  saveApplicationDraft,
  type Application,
  type BidderRequirement,
} from "../api/bidder.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";
import { TenderStatusBadge } from "../components/tenderDisplay.tsx";

export function BidderApplicationPage() {
  const { applicationId } = useParams();
  const { state } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [requirements, setRequirements] = useState<BidderRequirement[]>([]);
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [oem, setOem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.status !== "authenticated" || !applicationId) {
      return;
    }

    const id = Number(applicationId);
    if (!Number.isInteger(id)) {
      setError("Application id is invalid");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getApplication(state.token, id)
      .then(async (result) => {
        if (cancelled) {
          return;
        }

        setApplication(result);
        setGstin(result.gstin);
        setPan(result.pan);
        setOem(result.oem);

        if (result.tender) {
          try {
            const tenderDetail = await getOpenTender(state.token, result.tender.id);
            if (!cancelled) {
              setRequirements(tenderDetail.requirements);
            }
          } catch {
            if (!cancelled) {
              setRequirements([]);
            }
          }
        }
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load application");
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
  }, [applicationId, state]);

  if (state.status !== "authenticated") {
    return null;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "authenticated" || !application) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await saveApplicationDraft(state.token, application.id, { gstin, pan, oem });
      setApplication(saved);
      setGstin(saved.gstin);
      setPan(saved.pan);
      setOem(saved.oem);
      setSuccess("Draft saved.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to save draft");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell role="bidder">
      <Link className="text-sm text-slate-600 hover:underline" to="/bidder">
        Back to open tenders
      </Link>
      <p className="mt-4 text-sm font-medium text-slate-500">Bidder application</p>

      {loading ? <p className="mt-4 text-sm text-slate-600">Loading application...</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>
      ) : null}

      {application ? (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                {application.tender?.title ?? "Application"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{application.tender?.department}</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              {application.status}
            </span>
          </div>

          {application.tender ? (
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Opening date</dt>
                <dd className="mt-1 text-slate-900">{application.tender.openingDate}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Closing date</dt>
                <dd className="mt-1 text-slate-900">{application.tender.closingDate}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Tender status</dt>
                <dd className="mt-1">
                  <TenderStatusBadge status={application.tender.status} />
                </dd>
              </div>
            </dl>
          ) : null}

          <form className="mt-8 space-y-4" onSubmit={handleSave}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">GSTIN</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                value={gstin}
                onChange={(event) => setGstin(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">PAN</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                value={pan}
                onChange={(event) => setPan(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">OEM</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                value={oem}
                onChange={(event) => setOem(event.target.value)}
              />
            </label>
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
          </form>
        </section>
      ) : null}

      {application && requirements.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Tender requirements</h3>
          <p className="mt-1 text-sm text-slate-600">Read-only. Verification is not part of this phase.</p>
          <ul className="mt-4 space-y-3">
            {requirements.map((requirement) => (
              <li key={requirement.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{requirement.name}</p>
                  <span className="text-xs font-medium text-slate-600">
                    {requirement.mandatory ? "MANDATORY" : "OPTIONAL"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{requirement.tenderClause}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {requirement.verificationMethod} · {requirement.ruleType}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
