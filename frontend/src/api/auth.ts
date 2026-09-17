import { apiRequest } from "./client.ts";

export type Role = "bidder" | "officer" | "admin";

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  token: string;
  user: PublicUser;
};

export type MeResponse = {
  user: PublicUser;
};

export function dashboardPath(role: Role): string {
  return `/${role}`;
}

export function roleLabel(role: Role): string {
  if (role === "bidder") {
    return "Bidder";
  }
  if (role === "officer") {
    return "Officer";
  }
  return "Admin";
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchCurrentUser(token: string): Promise<PublicUser> {
  const result = await apiRequest<MeResponse>("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return result.user;
}
