import { getDb } from "../db/client";
import { isRole, type PublicUser, type Role, type UserRecord } from "../auth/types";

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  created_at: string;
};

const userColumns = `id, email, password_hash, full_name, role, created_at`;

function mapUser(row: UserRow): UserRecord | null {
  if (!isRole(row.role)) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    full_name: row.full_name,
    role: row.role,
    created_at: row.created_at,
  };
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
  };
}

export function findUserByEmail(email: string): UserRecord | null {
  const row = getDb()
    .prepare(`SELECT ${userColumns} FROM users WHERE lower(email) = lower(?) LIMIT 1`)
    .get(email) as UserRow | undefined;

  return row ? mapUser(row) : null;
}

export function findUserById(id: number): UserRecord | null {
  const row = getDb()
    .prepare(`SELECT ${userColumns} FROM users WHERE id = ? LIMIT 1`)
    .get(id) as UserRow | undefined;

  return row ? mapUser(row) : null;
}

export function upsertDemoUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
}): void {
  getDb()
    .prepare(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES (@email, @passwordHash, @fullName, @role)
       ON CONFLICT(email) DO UPDATE SET
         password_hash = excluded.password_hash,
         full_name = excluded.full_name,
         role = excluded.role,
         updated_at = datetime('now')`
    )
    .run({
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      role: input.role,
    });
}
