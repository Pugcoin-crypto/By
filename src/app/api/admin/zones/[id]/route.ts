import { zoneSchema } from "@/lib/admin-schemas";
import { requireStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";
import { parseBody } from "../../_util";

/** Create or replace a delivery zone (admin). */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/zones/[id]">) {
  const auth = await requireStaff(request, "admin");
  if (auth instanceof Response) return auth;
  const zone = await parseBody(request, zoneSchema);
  if (zone instanceof Response) return zone;
  if (zone.id !== (await ctx.params).id) return Response.json({ error: "Az azonosító nem módosítható." }, { status: 400 });
  await (await getStore()).saveZone(zone);
  return Response.json(zone);
}
