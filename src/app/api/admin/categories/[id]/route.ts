import { categorySchema } from "@/lib/admin-schemas";
import { requireStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";
import { parseBody } from "../../_util";

/** Create or replace a category (admin). */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/categories/[id]">) {
  const auth = await requireStaff(request, "admin");
  if (auth instanceof Response) return auth;
  const category = await parseBody(request, categorySchema);
  if (category instanceof Response) return category;
  if (category.id !== (await ctx.params).id) return Response.json({ error: "Az azonosító nem módosítható." }, { status: 400 });
  await (await getStore()).saveCategory(category);
  return Response.json(category);
}
