import { modifierGroupSchema } from "@/lib/admin-schemas";
import { requireStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";
import { parseBody } from "../../_util";

/** Create or replace an option group (admin). */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/modifier-groups/[id]">) {
  const auth = await requireStaff(request, "admin");
  if (auth instanceof Response) return auth;
  const group = await parseBody(request, modifierGroupSchema);
  if (group instanceof Response) return group;
  if (group.id !== (await ctx.params).id) return Response.json({ error: "Az azonosító nem módosítható." }, { status: 400 });
  if (group.defaultOptionId && !group.options.some((o) => o.id === group.defaultOptionId)) {
    return Response.json({ error: "Az alapértelmezett opció nincs a listában." }, { status: 400 });
  }
  await (await getStore()).saveModifierGroup(group);
  return Response.json(group);
}
