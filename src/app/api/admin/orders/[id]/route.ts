import { orderActionSchema } from "@/lib/admin-schemas";
import { requireStaff } from "@/server/admin-auth";
import { changeOrderStatus, setOrderEta } from "@/server/admin-orders";
import { getStore } from "@/server/store";
import { parseBody } from "../../_util";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const order = await (await getStore()).getOrder((await ctx.params).id);
  return order ? Response.json(order) : Response.json({ error: "Nincs ilyen rendelés." }, { status: 404 });
}

/** { action: "status", from, to, etaMinutes?, rejectReason? } or { action: "eta", etaMinutes } */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  const auth = await requireStaff(request);
  if (auth instanceof Response) return auth;
  const body = await parseBody(request, orderActionSchema);
  if (body instanceof Response) return body;
  const { id } = await ctx.params;
  const store = await getStore();
  const result =
    body.action === "status"
      ? await changeOrderStatus(store, id, body, auth.email || auth.uid)
      : await setOrderEta(store, id, body.etaMinutes);
  return result.ok ? Response.json(result.order) : Response.json({ error: result.error }, { status: result.status });
}
