import "server-only";
import { nextStatuses } from "@/lib/order-status";
import type { Order, OrderStatus } from "@/lib/types";
import type { Store } from "./store";

export type OrderActionResult = { ok: true; order: Order } | { ok: false; status: number; error: string };

export async function changeOrderStatus(
  store: Store,
  id: string,
  input: { from: OrderStatus; to: OrderStatus; etaMinutes?: number; rejectReason?: string },
  by: string,
  now = new Date(),
): Promise<OrderActionResult> {
  const order = await store.getOrder(id);
  if (!order) return { ok: false, status: 404, error: "Nincs ilyen rendelés." };
  if (order.status !== input.from) {
    return { ok: false, status: 409, error: "A rendelés állapota közben megváltozott. Frissítsd a listát." };
  }
  if (!nextStatuses(order.status, order.fulfillment).includes(input.to)) {
    return { ok: false, status: 400, error: "Ez a lépés ebből az állapotból nem lehetséges." };
  }
  if (input.to === "rejected" && !input.rejectReason) {
    return { ok: false, status: 400, error: "Add meg az elutasítás okát." };
  }

  const at = now.toISOString();
  const eta = input.to === "accepted" && input.etaMinutes ? input.etaMinutes : undefined;
  const updated = await store.updateOrder(id, input.from, {
    status: input.to,
    statusHistory: [...order.statusHistory, { status: input.to, at, by }],
    ...(eta ? { etaMinutes: eta, etaAt: new Date(now.getTime() + eta * 60_000).toISOString() } : {}),
    ...(input.to === "rejected" ? { rejectReason: input.rejectReason } : {}),
    ...(input.to === "completed" ? { paymentStatus: "paid" as const } : {}),
  });
  if (!updated) return { ok: false, status: 409, error: "A rendelés állapota közben megváltozott. Frissítsd a listát." };
  return { ok: true, order: updated };
}

export async function setOrderEta(store: Store, id: string, etaMinutes: number, now = new Date()): Promise<OrderActionResult> {
  const order = await store.getOrder(id);
  if (!order) return { ok: false, status: 404, error: "Nincs ilyen rendelés." };
  if (order.status === "completed" || order.status === "rejected") {
    return { ok: false, status: 400, error: "Lezárt rendelés ideje nem módosítható." };
  }
  const updated = await store.updateOrder(id, order.status, {
    etaMinutes,
    etaAt: new Date(now.getTime() + etaMinutes * 60_000).toISOString(),
  });
  return updated ? { ok: true, order: updated } : { ok: false, status: 409, error: "Próbáld újra." };
}
