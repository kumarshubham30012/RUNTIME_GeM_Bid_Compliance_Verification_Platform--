import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { isRole, type Role } from "./types";

export type AuthTokenPayload = {
  userId: number;
  role: Role;
};

export function signAuthToken(userId: number, role: Role): string {
  return jwt.sign({ role }, env.jwtSecret, {
    subject: String(userId),
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token");
  }

  const userId = Number(decoded.sub);
  const role = "role" in decoded ? decoded.role : undefined;

  if (!Number.isInteger(userId) || userId <= 0 || !isRole(role)) {
    throw new Error("Invalid token");
  }

  return { userId, role };
}
