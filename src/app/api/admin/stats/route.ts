import { buildStats } from "@/lib/stats";
import { requireStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";

/** Today and the last 7 days (Europe/Budapest). */
export async function GET(request: Request) {
  const auth = await requireStaff(request, "admin");
  if (auth instanceof Response) return auth;
  const now = new Date();
  const store = await getStore();
  const orders = await store.listOrdersSince(new Date(now.getTime() - 8 * 86_400_000).toISOString());
  return Response.json(buildStats(orders, now), { headers: { "Cache-Control": "no-store" } });
}
