// Server-side order placement. Everything the customer sends is re-checked
// here; the total is computed from the database, never taken from the request.

import "server-only";
import { randomBytes } from "node:crypto";
import { findZone } from "@/lib/delivery";
import { storeState } from "@/lib/hours";
import { normalizeHungarianPhone } from "@/lib/phone";
import { indexCatalog, priceCart, PricingError, formatHuf } from "@/lib/pricing";
import { placeOrderSchema } from "@/lib/schemas";
import type { Order } from "@/lib/types";
import type { Store } from "./store";

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; status: number; error: string; field?: string; productId?: string };

export async function placeOrder(body: unknown, store: Store, now = new Date()): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, status: 400, error: issue?.message ?? "Hibás adatok.", field: issue?.path.join(".") };
  }
  const input = parsed.data;
  if (input.website) return { ok: false, status: 400, error: "Hibás adatok." };

  const phone = normalizeHungarianPhone(input.customer.phone);
  if (!phone) {
    return { ok: false, status: 400, error: "Adj meg egy érvényes magyar telefonszámot (pl. +36 30 123 4567).", field: "customer.phone" };
  }

  const [catalog, settings, zones] = await Promise.all([store.getCatalog(), store.getSettings(), store.getZones()]);

  const state = storeState(settings, now);
  if (!state.open) return { ok: false, status: 409, error: state.message };

  let priced: ReturnType<typeof priceCart>;
  try {
    priced = priceCart(input.items, indexCatalog(catalog));
  } catch (e) {
    if (e instanceof PricingError) return { ok: false, status: 409, error: e.message, productId: e.productId };
    throw e;
  }

  let deliveryFee = 0;
  let etaMinutes = settings.pickupEtaMinutes;
  let zoneId: string | undefined;
  if (input.fulfillment === "delivery") {
    const address = input.address!;
    const zone = findZone(zones, address.zip, address.city);
    if (!zone) {
      return {
        ok: false,
        status: 400,
        error: `Erre a címre sajnos nem szállítunk. Szállítási területünk: ${zones.filter((z) => z.active).map((z) => z.city).join(", ")}.`,
        field: "address.zip",
      };
    }
    if (priced.subtotal < zone.minOrderValue) {
      return { ok: false, status: 400, error: `${zone.city} esetén a minimális rendelési érték ${formatHuf(zone.minOrderValue)}.` };
    }
    deliveryFee = zone.fee;
    etaMinutes = zone.etaMinutes || settings.defaultEtaMinutes;
    zoneId = zone.id;
  }

  if (priced.subtotal < settings.minOrderValue) {
    return { ok: false, status: 400, error: `A minimális rendelési érték ${formatHuf(settings.minOrderValue)}.` };
  }

  const createdAt = now.toISOString();
  const order = await store.createOrder({
    trackingToken: randomBytes(18).toString("base64url"),
    status: "new",
    fulfillment: input.fulfillment,
    customer: { name: input.customer.name, phone },
    ...(input.fulfillment === "delivery" ? { address: input.address, zoneId } : {}),
    ...(input.note ? { note: input.note } : {}),
    paymentMethod: input.paymentMethod,
    paymentStatus: "unpaid",
    items: priced.items,
    subtotal: priced.subtotal,
    deliveryFee,
    total: priced.subtotal + deliveryFee,
    etaMinutes,
    etaAt: new Date(now.getTime() + etaMinutes * 60_000).toISOString(),
    statusHistory: [{ status: "new", at: createdAt }],
    createdAt,
  });
  return { ok: true, order };
}
