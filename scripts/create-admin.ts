// Creates (or promotes) a staff account and sets its role claim.
//   npm run create-admin -- email@example.com            → admin
//   npm run create-admin -- email@example.com --staff    → staff
// A new user gets a random temporary password and a password-reset link is printed.

import { randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getAdminDb } from "../src/server/store-firestore";

async function main() {
  const email = process.argv[2];
  if (!email || !email.includes("@")) throw new Error("Használat: npm run create-admin -- email@pelda.hu [--staff]");
  const role = process.argv.includes("--staff") ? "staff" : "admin";

  getAdminDb(); // initialises the Admin app
  const auth = getAuth();
  const user = await auth.getUserByEmail(email).catch(async () =>
    auth.createUser({ email, password: randomBytes(24).toString("base64url") }),
  );
  await auth.setCustomUserClaims(user.uid, { role });
  const link = await auth.generatePasswordResetLink(email);
  console.log(`${email} szerepköre: ${role}. Jelszó beállítása ezen a linken: ${link}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
