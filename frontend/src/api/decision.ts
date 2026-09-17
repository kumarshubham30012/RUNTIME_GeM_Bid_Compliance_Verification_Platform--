import { apiRequest } from "./client.ts";

export const OFFICER_DECISIONS = [
  "APPROVE",
  "REJECT",
  "REQUEST_CLARIFICATION",
  "KEEP_UNDER_REVIEW",
] as const;

export type OfficerDecisionType = (typeof OFFICER_DECISIONS)[number];

export type OfficerDecision = {
  applicationId: number;
  officerUserId: number;
  decision: OfficerDecisionType;
  reason: string;
  decidedAt: string;
};

export type AuditEvent = {
  eventType: string;
  description: string;
  actorUserId: number | null;
  timestamp: string;
  entityId: number | null;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function getOfficerDecision(
  token: string,
  applicationId: number
): Promise<OfficerDecision | null> {
  const result = await apiRequest<{ decision: OfficerDecision | null }>(
    `/api/officer/applications/${applicationId}/decision`,
    { headers: authHeaders(token) }
  );
  return result.decision;
}

export async function saveOfficerDecision(
  token: string,
  applicationId: number,
  decision: OfficerDecisionType,
  reason: string
): Promise<OfficerDecision> {
  const result = await apiRequest<{ decision: OfficerDecision }>(
    `/api/officer/applications/${applicationId}/decision`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ decision, reason }),
    }
  );
  return result.decision;
}

export async function listAuditEvents(token: string, applicationId: number): Promise<AuditEvent[]> {
  const result = await apiRequest<{ events: AuditEvent[] }>(
    `/api/officer/applications/${applicationId}/audit`,
    { headers: authHeaders(token) }
  );
  return result.events;
}
