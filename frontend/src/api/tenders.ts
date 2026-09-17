import { apiRequest } from "./client.ts";

export type TenderStatus = "upcoming" | "open" | "closed";

export type Tender = {
  id: number;
  title: string;
  department: string;
  openingDate: string;
  closingDate: string;
  status: TenderStatus;
  createdByUserId: number;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  bidderCount: number;
  pendingReviews: number;
  completedReviews: number;
  statsPlaceholder: boolean;
};

export type CreateTenderInput = {
  title: string;
  department: string;
  openingDate: string;
  closingDate: string;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listTenders(token: string): Promise<Tender[]> {
  const result = await apiRequest<{ tenders: Tender[] }>("/api/tenders", {
    headers: authHeaders(token),
  });
  return result.tenders;
}

export async function getTender(token: string, id: number): Promise<Tender> {
  const result = await apiRequest<{ tender: Tender }>(`/api/tenders/${id}`, {
    headers: authHeaders(token),
  });
  return result.tender;
}

export async function createTender(token: string, input: CreateTenderInput): Promise<Tender> {
  const result = await apiRequest<{ tender: Tender }>("/api/tenders", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  return result.tender;
}
