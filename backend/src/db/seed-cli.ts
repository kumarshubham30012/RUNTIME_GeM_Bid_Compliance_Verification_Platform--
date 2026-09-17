import { getDb } from "./client";
import { DEMO_USERS, seedDemoUsers } from "./seed";

getDb();
seedDemoUsers();

console.log("Demo users seeded (development/testing only):");
for (const user of DEMO_USERS) {
  console.log(`- ${user.role}: ${user.email} / ${user.password}`);
}
