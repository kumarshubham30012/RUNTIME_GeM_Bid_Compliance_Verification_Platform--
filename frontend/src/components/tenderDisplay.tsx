import { Link } from "react-router-dom";
import type { Tender, TenderStatus } from "../api/tenders.ts";

export function statusLabel(status: TenderStatus): string {
  if (status === "upcoming") {
    return "Upcoming";
  }
  if (status === "open") {
    return "Open";
  }
  return "Closed";
}

export function statusClassName(status: TenderStatus): string {
  if (status === "upcoming") {
    return "bg-slate-100 text-slate-700";
  }
  if (status === "open") {
    return "bg-emerald-50 text-emerald-700";
  }
  return "bg-red-50 text-red-700";
}

export function placeholderStat(value: number): string {
  return `${value} (not yet tracked)`;
}

export function TenderStatusBadge({ status }: { status: TenderStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

export function TenderMeta({ tender }: { tender: Tender }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">Title</dt>
        <dd className="mt-1 text-slate-900">{tender.title}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">Department</dt>
        <dd className="mt-1 text-slate-900">{tender.department}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">Opening date</dt>
        <dd className="mt-1 text-slate-900">{tender.openingDate}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">Closing date</dt>
        <dd className="mt-1 text-slate-900">{tender.closingDate}</dd>
      </div>
    </dl>
  );
}

export function TenderListLink({ tender }: { tender: Tender }) {
  return (
    <Link className="font-medium text-slate-900 hover:underline" to={`/officer/tenders/${tender.id}`}>
      {tender.title}
    </Link>
  );
}
