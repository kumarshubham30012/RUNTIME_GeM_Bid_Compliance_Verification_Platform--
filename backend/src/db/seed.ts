import bcrypt from "bcryptjs";
import { upsertDemoUser } from "../users/userRepository";
import type { Role } from "../auth/types";

export const DEMO_USERS: Array<{
  email: string;
  password: string;
  fullName: string;
  role: Role;
}> = [
  {
    email: "bidder@demo.local",
    password: "DemoBidder123!",
    fullName: "Demo Bidder",
    role: "bidder",
  },
  {
    email: "officer@demo.local",
    password: "DemoOfficer123!",
    fullName: "Demo Officer",
    role: "officer",
  },
  {
    email: "admin@demo.local",
    password: "DemoAdmin123!",
    fullName: "Demo Admin",
    role: "admin",
  },
];

export function seedDemoUsers(): void {
  for (const demoUser of DEMO_USERS) {
    upsertDemoUser({
      email: demoUser.email,
      passwordHash: bcrypt.hashSync(demoUser.password, 10),
      fullName: demoUser.fullName,
      role: demoUser.role,
    });
  }
}
