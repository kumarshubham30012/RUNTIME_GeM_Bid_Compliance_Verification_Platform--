import type { PublicUser, Role } from "../auth/types";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        role: Role;
      };
      currentUser?: PublicUser;
    }
  }
}

export {};
