import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client.ts";
import {
  downloadOfficerDocument,
  fetchOfficerApplication,
  reviewErrorMessage,
  type OfficerApplicationDetail,
} from "../api/officerApplications.ts";
import { useAuth } from "../auth/AuthContext.tsx";
import { AppShell } from "../components/AppShell.tsx";
import { TenderStatusBadge } from "../components/tenderDisplay.tsx";
import { VerificationCenter } from "../components/VerificationCenter.tsx";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") {
    return "PDF";
  }
  if (mimeType === "image/png") {
    return "PNG";
  }
  if (mimeType === "image/jpeg") {
    return "JPEG";
  }
  return mimeType;
}

export function OfficerApplicationDetailPage() {
  const { applicationId } = useParams();
  const { state } = useAuth();
  const [detail, setDetail] = useState<OfficerApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

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

    fetchOfficerApplication(state.token, id)
      .then((result) => {
        if (!cancelled) {
          setDetail(result);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setError(caught instanceof ApiError ? reviewErrorMessage(caught) : "Unable to load application");
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

  async function handleDownload(documentId: number) {
    if (state.status !== "authenticated" || !detail) {
      return;
    }

    setDownloadingId(documentId);
    setError(null);

    try {
      const { blob, filename } = await downloadOfficerDocument(state.token, detail.application.id, documentId);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      setError(caught instanceof ApiError ? reviewErrorMessage(caught) : "Unable to download document");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <AppShell role="officer">
      <Link className="text-sm text-slate-600 hover:underline" to="/officer">
        Back to dashboard
      </Link>
      <p className="mt-4 text-sm font-medium text-slate-500">Application review</p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? <p className="mt-6 text-sm text-slate-600">Loading application...</p> : null}

      {!loading && !detail && !error ? (
        <p className="mt-6 text-sm text-slate-600">Application not found.</p>
      ) : null}

      {detail ? (
        <>
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{detail.tender.title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Application #{detail.application.id} · {detail.bidder.name}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  detail.application.status === "SUBMITTED"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {detail.application.status}
              </span>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Tender information</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Title</dt>
                <dd className="mt-1 text-slate-900">{detail.tender.title}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Bid number</dt>
                <dd className="mt-1 text-slate-900">{detail.tender.bidNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Department</dt>
                <dd className="mt-1 text-slate-900">{detail.tender.department}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Tender status</dt>
                <dd className="mt-1">
                  <TenderStatusBadge status={detail.tender.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Opening date</dt>
                <dd className="mt-1 text-slate-900">{detail.tender.openingDate}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Closing date</dt>
                <dd className="mt-1 text-slate-900">{detail.tender.closingDate}</dd>
              </div>
            </dl>
            {detail.tender.description ? (
              <p className="mt-4 text-sm text-slate-600">{detail.tender.description}</p>
            ) : null}
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Bidder / company information</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Bidder name</dt>
                <dd className="mt-1 text-slate-900">{detail.bidder.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Bidder email</dt>
                <dd className="mt-1 text-slate-900">{detail.bidder.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">GSTIN</dt>
                <dd className="mt-1 text-slate-900">{detail.application.gstin || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">PAN</dt>
                <dd className="mt-1 text-slate-900">{detail.application.pan || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">OEM</dt>
                <dd className="mt-1 text-slate-900">{detail.application.oem || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Udyam (demo)</dt>
                <dd className="mt-1 text-slate-900">{detail.application.udyam || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Requirement review</h3>
            <p className="mt-1 text-sm text-slate-600">
              Documents are shown as submitted. This screen does not verify compliance.
            </p>

            {detail.requirements.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No requirements are configured for this tender.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {detail.requirements.map((requirement) => (
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

                    <p className="mt-4 text-sm font-medium text-slate-700">Uploaded documents</p>
                    {requirement.documents.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">
                        No documents uploaded for this requirement.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {requirement.documents.map((document) => (
                          <li
                            key={document.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700"
                          >
                            <span>
                              {document.originalFilename} · {mimeLabel(document.mimeType)} ·{" "}
                              {formatFileSize(document.fileSize)}
                            </span>
                            <button
                              className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700 disabled:opacity-60"
                              type="button"
                              disabled={downloadingId === document.id}
                              onClick={() => void handleDownload(document.id)}
                            >
                              {downloadingId === document.id ? "Opening..." : "View / Download"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <VerificationCenter
            token={state.token}
            applicationId={detail.application.id}
            requirements={detail.requirements}
          />
        </>
      ) : null}
    </AppShell>
  );
}
