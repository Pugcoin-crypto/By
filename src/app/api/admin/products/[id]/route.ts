import { z } from "zod";
import { productSchema } from "@/lib/admin-schemas";
import { requireStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";
import { checkRefs, parseBody } from "../../_util";

/** "Elfogyott" switch – staff may use it. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const body = await parseBody(request, z.object({ available: z.boolean() }));
  if (body instanceof Response) return body;
  const ok = await (await getStore()).setProductAvailable((await ctx.params).id, body.available);
  return ok ? Response.json({ available: body.available }) : Response.json({ error: "Nincs ilyen termék." }, { status: 404 });
}

/** Full edit (admin). */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const auth = await requireStaff(request, "admin");
  if (auth instanceof Response) return auth;
  const product = await parseBody(request, productSchema);
  if (product instanceof Response) return product;
  const { id } = await ctx.params;
  if (product.id !== id) return Response.json({ error: "Az azonosító nem módosítható." }, { status: 400 });
  const store = await getStore();
  const catalog = await store.getCatalog();
  if (!catalog.products.some((p) => p.id === id)) return Response.json({ error: "Nincs ilyen termék." }, { status: 404 });
  const problem = checkRefs(product, catalog);
  if (problem) return Response.json({ error: problem }, { status: 400 });
  await store.saveProduct({ ...product, imageUrl: product.imageUrl || undefined });
  return Response.json(product);
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const auth = await requireStaff(request, "admin");
  if (auth instanceof Response) return auth;
  await (await getStore()).deleteProduct((await ctx.params).id);
  return new Response(null, { status: 204 });
}
