// Staff sessions for /admin.
//
// - With Firebase: the browser signs in with Firebase Auth and sends its ID
//   token once; we exchange it for an httpOnly Firebase session cookie. The
//   role ("admin" | "staff") is a custom claim set by `npm run create-admin`.
// - Without Firebase (local / memory mode): a single password from
//   ADMIN_DEV_PASSWORD and an HMAC-signed cookie.

import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { hasFirebaseCredentials } from "./store";

export type StaffRole = "admin" | "staff";
export interface StaffSession {
  uid: string;
  email: string;
  role: StaffRole;
}

export const SESSION_COOKIE = "ek_admin";
const SESSION_DAYS = 5;
const SESSION_MS = SESSION_DAYS * 24 * 3600_000;

const g = globalThis as unknown as { __ekDevSecret?: string };
function devSecret(): string {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  // Per-process fallback: sessions end when the dev server restarts.
  return (g.__ekDevSecret ??= randomBytes(32).toString("hex"));
}

const sign = (payload: string) => createHmac("sha256", devSecret()).update(payload).digest("base64url");

export function devLoginEnabled(): boolean {
  return !hasFirebaseCredentials() && !!process.env.ADMIN_DEV_PASSWORD;
}

/**
 * The owner's e-mail from ADMIN_EMAIL is always admin, so the first login works
 * without running `npm run create-admin`. Only a password account counts, and the
 * owner should create it in the Firebase console before setting the variable.
 */
function bootstrapRole(decoded: { email?: string; firebase?: { sign_in_provider?: string } }): StaffRole | undefined {
  const owner = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!owner || !decoded.email || decoded.firebase?.sign_in_provider !== "password") return undefined;
  return decoded.email.toLowerCase() === owner ? "admin" : undefined;
}

async function firebaseAuth() {
  const { getAdminDb } = await import("./store-firestore");
  getAdminDb();
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth();
}

/** Creates the cookie value for a successful login, or returns an error message. */
export async function createSession(
  input: { idToken?: string; password?: string },
): Promise<{ ok: true; value: string; session: StaffSession; refreshToken?: boolean } | { ok: false; error: string }> {
  if (hasFirebaseCredentials()) {
    if (!input.idToken) return { ok: false, error: "Hiányzó bejelentkezés." };
    const auth = await firebaseAuth();
    const decoded = await auth.verifyIdToken(input.idToken).catch(() => null);
    if (!decoded) return { ok: false, error: "Sikertelen bejelentkezés." };
    let role = decoded.role as StaffRole | undefined;
    let refreshToken = false;
    if (role !== "admin" && bootstrapRole(decoded) === "admin") {
      // Store the claim too, so Firestore rules (live order board) see it after a token refresh.
      await auth.setCustomUserClaims(decoded.uid, { role: "admin" });
      role = "admin";
      refreshToken = true;
    }
    if (role !== "admin" && role !== "staff") return { ok: false, error: "Ehhez a fiókhoz nincs admin jogosultság." };
    const value = await auth.createSessionCookie(input.idToken, { expiresIn: SESSION_MS });
    return { ok: true, value, session: { uid: decoded.uid, email: decoded.email ?? "", role }, refreshToken };
  }

  const expected = process.env.ADMIN_DEV_PASSWORD;
  if (!expected) return { ok: false, error: "A bejelentkezés nincs beállítva (ADMIN_DEV_PASSWORD vagy Firebase)." };
  const a = Buffer.from(input.password ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, error: "Hibás jelszó." };
  const session: StaffSession = { uid: "dev-admin", email: "admin@helyi", role: "admin" };
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + SESSION_MS })).toString("base64url");
  return { ok: true, value: `${payload}.${sign(payload)}`, session };
}

export async function verifySession(value: string | undefined): Promise<StaffSession | null> {
  if (!value) return null;
  if (hasFirebaseCredentials()) {
    const auth = await firebaseAuth();
    const decoded = await auth.verifySessionCookie(value, true).catch(() => null);
    if (!decoded) return null;
    const role = (decoded.role as StaffRole | undefined) ?? bootstrapRole(decoded);
    if (role !== "admin" && role !== "staff") return null;
    return { uid: decoded.uid, email: decoded.email ?? "", role };
  }
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expectedMac = sign(payload);
  if (mac.length !== expectedMac.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expectedMac))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as StaffSession & { exp: number };
    if (data.exp < Date.now()) return null;
    return { uid: data.uid, email: data.email, role: data.role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 3600,
};

/** For server components: the signed-in staff member, or null. */
export async function currentStaff(): Promise<StaffSession | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/**
 * For admin Route Handlers. Returns the session, or a ready 401/403 Response.
 * Mutating requests must come from our own origin (CSRF guard on top of SameSite=Strict).
 */
export async function requireStaff(request: Request, role: StaffRole = "staff"): Promise<StaffSession | Response> {
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (origin && host && new URL(origin).host !== host) {
      return Response.json({ error: "Tiltott kérés." }, { status: 403 });
    }
  }
  const cookie = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const session = await verifySession(cookie ? decodeURIComponent(cookie) : undefined);
  if (!session) return Response.json({ error: "Jelentkezz be újra." }, { status: 401 });
  if (role === "admin" && session.role !== "admin") {
    return Response.json({ error: "Ehhez admin jogosultság kell." }, { status: 403 });
  }
  return session;
}
