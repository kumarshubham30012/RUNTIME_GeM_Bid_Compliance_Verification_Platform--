import { apiRequest } from "./client.ts";
import type { PublicUser } from "./auth.ts";

export type AdminTenderRow = {
  officerId: number;
  officerName: string;
  officerEmail: string;
  tenderId: number;
  title: string;
  department: string;
  status: string;
  applicationCount: number;
};

export type SandboxGstRecord = {
  gstin: string;
  legalName: string;
  registrationStatus: string;
  state: string;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listAdminUsers(token: string): Promise<PublicUser[]> {
  const result = await apiRequest<{ users: PublicUser[] }>("/api/admin/users", {
    headers: authHeaders(token),
  });
  return result.users;
}

export async function createAdminUser(
  token: string,
  input: { email: string; password: string; fullName: string; role: "officer" | "admin" }
): Promise<PublicUser> {
  const result = await apiRequest<{ user: PublicUser }>("/api/admin/users", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return result.user;
}

export async function deleteAdminUser(token: string, userId: number): Promise<void> {
  await apiRequest<{ removed: boolean }>(`/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function listAdminTenders(token: string): Promise<AdminTenderRow[]> {
  const result = await apiRequest<{ tenders: AdminTenderRow[] }>("/api/admin/tenders", {
    headers: authHeaders(token),
  });
  return result.tenders;
}

export async function listSandboxGst(token: string): Promise<SandboxGstRecord[]> {
  const result = await apiRequest<{ records: SandboxGstRecord[] }>("/api/admin/sandbox/gst", {
    headers: authHeaders(token),
  });
  return result.records;
}

export async function updateSandboxGst(
  token: string,
  gstin: string,
  fields: { legalName?: string; registrationStatus?: string; state?: string }
): Promise<SandboxGstRecord> {
  const result = await apiRequest<{ record: SandboxGstRecord }>(
    `/api/admin/sandbox/gst/${encodeURIComponent(gstin)}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(fields),
    }
  );
  return result.record;
}
