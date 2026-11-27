import type { NextRequest } from "next/server";
import { requireStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";

/** Orders created in the last `hours` hours (default 18, max 72), newest first. */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const hours = Math.min(72, Math.max(1, Number(request.nextUrl.searchParams.get("hours")) || 18));
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const orders = await (await getStore()).listOrdersSince(since);
  return Response.json({ orders }, { headers: { "Cache-Control": "no-store" } });
}
