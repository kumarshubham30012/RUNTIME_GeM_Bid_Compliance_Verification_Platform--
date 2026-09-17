import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client.ts";
import {
  deleteApplicationDocument,
  getApplication,
  getApplicationRequirements,
  getSubmissionStatus,
  saveApplicationDraft,
  submitApplication,
  uploadApplicationDocument,
  type Application,
  type BidderRequirement,
  type SubmissionStatus,
} from "../api/bidder.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";
import { TenderStatusBadge } from "../components/tenderDisplay.tsx";
import { VerificationCenter } from "../components/VerificationCenter.tsx";
import { EntityResolutionCenter } from "../components/EntityResolutionCenter.tsx";
import { ComplianceResults } from "../components/ComplianceResults.tsx";
import { EvidenceFindings } from "../components/EvidenceFindings.tsx";
import { BidderStatusView } from "../components/BidderStatusView.tsx";

export function BidderApplicationPage() {
  const { applicationId } = useParams();
  const { state } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [requirements, setRequirements] = useState<BidderRequirement[]>([]);
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null);
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [oem, setOem] = useState("");
  const [udyam, setUdyam] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingRequirementId, setUploadingRequirementId] = useState<number | null>(null);

  async function load(token: string, id: number) {
    const [app, reqs, status] = await Promise.all([
      getApplication(token, id),
      getApplicationRequirements(token, id),
      getSubmissionStatus(token, id),
    ]);
    setApplication(app);
    setGstin(app.gstin);
    setPan(app.pan);
    setOem(app.oem);
    setUdyam(app.udyam ?? "");
    setRequirements(reqs);
    setSubmission(status);
  }

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

    load(state.token, id)
      .then(() => {
        if (!cancelled) {
          setError(null);
        }
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

  const isDraft = application?.status === "DRAFT";

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "authenticated" || !application) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await saveApplicationDraft(state.token, application.id, { gstin, pan, oem, udyam });
      setApplication(saved);
      setSuccess("Draft saved.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(requirementId: number, file: File) {
    if (state.status !== "authenticated" || !application) {
      return;
    }

    setUploadingRequirementId(requirementId);
    setError(null);
    setSuccess(null);

    try {
      await uploadApplicationDocument(state.token, application.id, requirementId, file);
      await load(state.token, application.id);
      setSuccess(`Uploaded ${file.name}.`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to upload document");
    } finally {
      setUploadingRequirementId(null);
    }
  }

  async function handleDelete(documentId: number) {
    if (state.status !== "authenticated" || !application) {
      return;
    }
    if (!window.confirm("Delete this document?")) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await deleteApplicationDocument(state.token, application.id, documentId);
      await load(state.token, application.id);
      setSuccess("Document deleted.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Unable to delete document");
    }
  }

  async function handleSubmit() {
    if (state.status !== "authenticated" || !application) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const submitted = await submitApplication(state.token, application.id);
      await load(state.token, submitted.id);
      setSuccess("Application submitted.");
    } catch (caught) {
      if (caught instanceof ApiError) {
        const missing = caught.extra.missingMandatoryRequirements;
        if (Array.isArray(missing) && missing.length > 0) {
          const names = missing
            .map((item) =>
              typeof item === "object" && item !== null && "name" in item ? String(item.name) : ""
            )
            .filter(Boolean);
          setError(
            names.length > 0
              ? `Mandatory documents are missing: ${names.join(", ")}`
              : caught.message
          );
        } else {
          setError(caught.message);
        }
      } else {
        setError("Unable to submit application");
      }
    } finally {
      setSubmitting(false);
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
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                application.status === "SUBMITTED"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
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
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                value={gstin}
                onChange={(event) => setGstin(event.target.value)}
                disabled={!isDraft}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">PAN</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                value={pan}
                onChange={(event) => setPan(event.target.value)}
                disabled={!isDraft}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">OEM</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                value={oem}
                onChange={(event) => setOem(event.target.value)}
                disabled={!isDraft}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Udyam number (sandbox)</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 disabled:bg-slate-100"
                value={udyam}
                onChange={(event) => setUdyam(event.target.value)}
                disabled={!isDraft}
              />
            </label>
            {isDraft ? (
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            ) : null}
          </form>
        </section>
      ) : null}

      {application ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Document checklist</h3>
          <p className="mt-1 text-sm text-slate-600">
            Upload documents for each requirement. This does not verify document contents.
          </p>

          {requirements.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No requirements are configured for this tender.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {requirements.map((requirement) => (
                <li key={requirement.id} className="rounded-xl border border-slate-200 p-4">
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
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    Document: {requirement.documentUploaded ? "Uploaded" : "Missing"}
                  </p>

                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {(requirement.documents ?? []).map((document) => (
                      <li key={document.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {document.originalFilename} ({document.mimeType}, {document.fileSize} bytes)
                        </span>
                        {isDraft ? (
                          <button
                            className="text-red-700 hover:underline"
                            type="button"
                            onClick={() => void handleDelete(document.id)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  {isDraft ? (
                    <label className="mt-3 block text-sm text-slate-700">
                      Upload PDF, PNG, or JPG (max 10 MB)
                      <input
                        className="mt-1 block w-full text-sm"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                        disabled={uploadingRequirementId === requirement.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) {
                            void handleUpload(requirement.id, file);
                          }
                        }}
                      />
                      {uploadingRequirementId === requirement.id ? (
                        <span className="mt-1 block text-xs text-slate-500">Uploading...</span>
                      ) : null}
                    </label>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {application && state.status === "authenticated" ? (
        <>
          <VerificationCenter
            token={state.token}
            applicationId={application.id}
            requirements={requirements}
          />
          <EntityResolutionCenter token={state.token} applicationId={application.id} />
          <BidderStatusView token={state.token} applicationId={application.id} />
          <ComplianceResults token={state.token} applicationId={application.id} />
          <EvidenceFindings token={state.token} applicationId={application.id} />
        </>
      ) : null}

      {application ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Submission</h3>
          {application.status === "SUBMITTED" ? (
            <p className="mt-2 text-sm text-emerald-700">This application has been submitted.</p>
          ) : submission?.canSubmit ? (
            <p className="mt-2 text-sm text-emerald-700">
              All mandatory documents uploaded. Application is ready for submission.
            </p>
          ) : (
            <div className="mt-2 text-sm text-slate-700">
              <p>Application cannot be submitted yet.</p>
              {(submission?.missingMandatoryRequirements.length ?? 0) > 0 ? (
                <>
                  <p className="mt-2 font-medium">Missing mandatory documents:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {submission?.missingMandatoryRequirements.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          )}

          {isDraft ? (
            <button
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              type="button"
              disabled={!submission?.canSubmit || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}
