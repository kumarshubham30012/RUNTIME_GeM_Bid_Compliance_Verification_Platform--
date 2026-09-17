import { API_BASE_URL, ApiError } from "./client.ts";

export type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

export async function fetchBackendHealth(): Promise<HealthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/health`);
  } catch {
    throw new ApiError(0, "Backend unavailable");
  }

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
