import { productSchema } from "@/lib/admin-schemas";
import { requireStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";
import { checkRefs, parseBody } from "../_util";

/** Create a product (admin). */
export async function POST(request: Request) {
  const auth = await requireStaff(request, "admin");
  if (auth instanceof Response) return auth;
  const product = await parseBody(request, productSchema);
  if (product instanceof Response) return product;
  const store = await getStore();
  const catalog = await store.getCatalog();
  if (catalog.products.some((p) => p.id === product.id)) {
    return Response.json({ error: "Már van termék ezzel az azonosítóval." }, { status: 409 });
  }
  const problem = checkRefs(product, catalog);
  if (problem) return Response.json({ error: problem }, { status: 400 });
  await store.saveProduct({ ...product, imageUrl: product.imageUrl || undefined });
  return Response.json(product, { status: 201 });
}
