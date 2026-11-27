import { cookies } from "next/headers";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/server/admin-auth";
import { rateLimit } from "@/server/rate-limit";

/** Log in: { idToken } with Firebase, { password } in local mode. */
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`login:${ip}`, 10, 10 * 60_000)) {
    return Response.json({ error: "Túl sok próbálkozás. Várj pár percet." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { idToken?: string; password?: string };
  const result = await createSession({ idToken: body.idToken, password: body.password });
  if (!result.ok) return Response.json({ error: result.error }, { status: 401 });
  (await cookies()).set(SESSION_COOKIE, result.value, sessionCookieOptions);
  return Response.json({ email: result.session.email, role: result.session.role, refreshToken: !!result.refreshToken });
}

/** Log out. */
export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
