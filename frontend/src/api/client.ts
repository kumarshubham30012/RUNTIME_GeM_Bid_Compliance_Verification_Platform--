export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  extra: Record<string, unknown>;

  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.extra = extra;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiError(0, "Backend unavailable");
  }

  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const extra =
      typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    const message =
      typeof extra.error === "string"
        ? extra.error
        : typeof extra.message === "string"
          ? extra.message
          : "Request failed";
    throw new ApiError(response.status, message, extra);
  }

  return data as T;
}
