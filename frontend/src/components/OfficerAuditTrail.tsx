import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import { listAuditEvents, type AuditEvent } from "../api/decision.ts";

export function OfficerAuditTrail({
  token,
  applicationId,
}: {
  token: string;
  applicationId: number;
}) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    listAuditEvents(token, applicationId)
      .then((items) => {
        if (!cancelled) {
          setEvents(items);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Unable to load audit trail");
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

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Audit Trail</h3>
      <p className="mt-2 text-sm text-slate-600">
        Chronological events reconstructed from stored records. Extraction events are omitted when
        no extraction data exists.
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading audit trail...</p> : null}

      {!loading && events.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No stored workflow events yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {events.map((event, index) => (
            <li key={`${event.eventType}-${event.entityId ?? index}-${event.timestamp}`} className="text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {event.timestamp} · {event.eventType.replaceAll("_", " ")}
                {event.actorUserId ? ` · user #${event.actorUserId}` : ""}
              </p>
              <p className="mt-1 text-slate-800">{event.description}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
