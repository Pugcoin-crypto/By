import { describeModifiers } from "@/lib/pricing";
import type { Order, OrderTracking } from "@/lib/types";

/** The PII-free projection shown on the public tracking page. */
export function toTracking(order: Order): OrderTracking {
  return {
    token: order.trackingToken,
    number: order.number,
    status: order.status,
    fulfillment: order.fulfillment,
    etaAt: order.etaAt,
    ...(order.rejectReason ? { rejectReason: order.rejectReason } : {}),
    items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, details: describeModifiers(i) })),
    total: order.total,
    createdAt: order.createdAt,
  };
}

export function formatOrderNumber(n: number): string {
  return `EK-${n}`;
}

export const FIRST_ORDER_NUMBER = 1001;
