import { z } from "zod";
import { requireStaff } from "@/server/admin-auth";
import { hasFirebaseCredentials } from "@/server/store";
import { parseBody } from "../_util";

async function auth() {
  const { getAdminDb } = await import("@/server/store-firestore");
  getAdminDb();
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth();
}

/** Staff accounts (admin only, Firebase mode). */
export async function GET(request: Request) {
  const session = await requireStaff(request, "admin");
  if (session instanceof Response) return session;
  if (!hasFirebaseCredentials()) return Response.json({ firebase: false, users: [] });
  const list = await (await auth()).listUsers(1000);
  const users = list.users
    .filter((u) => u.customClaims?.role === "admin" || u.customClaims?.role === "staff")
    .map((u) => ({ uid: u.uid, email: u.email, role: u.customClaims?.role, disabled: u.disabled, lastSignIn: u.metadata.lastSignInTime }));
  return Response.json({ firebase: true, users });
}

/** Add a staff member or change a role: { email, role }. Returns a password-setup link to hand over. */
export async function POST(request: Request) {
  const session = await requireStaff(request, "admin");
  if (session instanceof Response) return session;
  if (!hasFirebaseCredentials()) return Response.json({ error: "Személyzet kezeléséhez Firebase kell." }, { status: 400 });
  const body = await parseBody(request, z.object({ email: z.email(), role: z.enum(["admin", "staff", "none"]) }));
  if (body instanceof Response) return body;
  if (body.email === session.email && body.role !== "admin") {
    return Response.json({ error: "A saját admin jogodat nem veheted el." }, { status: 400 });
  }
  const a = await auth();
  const { randomBytes } = await import("node:crypto");
  const user = await a.getUserByEmail(body.email).catch(() =>
    body.role === "none" ? null : a.createUser({ email: body.email, password: randomBytes(24).toString("base64url") }),
  );
  if (!user) return Response.json({ error: "Nincs ilyen felhasználó." }, { status: 404 });
  await a.setCustomUserClaims(user.uid, body.role === "none" ? {} : { role: body.role });
  if (body.role === "none") await a.revokeRefreshTokens(user.uid);
  const link = body.role === "none" ? null : await a.generatePasswordResetLink(body.email);
  return Response.json({ uid: user.uid, role: body.role, passwordLink: link });
}
