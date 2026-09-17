export const ROLES = ["bidder", "officer", "admin"] as const;

export type Role = (typeof ROLES)[number];

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type UserRecord = {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
