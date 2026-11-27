import type { NextRequest } from "next/server";
import { getStore } from "@/server/store";

/** Public tracking view (no name, phone or address). Firestore clients can also listen to orderTracking/{token}. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/orders/track/[token]">) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return Response.json({ error: "Nincs ilyen rendelés." }, { status: 404 });
  const tracking = await (await getStore()).getTracking(token);
  if (!tracking) return Response.json({ error: "Nincs ilyen rendelés." }, { status: 404 });
  return Response.json(tracking, { headers: { "Cache-Control": "no-store" } });
}
