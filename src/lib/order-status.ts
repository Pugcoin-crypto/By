// Allowed order status moves, used by the admin dashboard (step 3).

import type { Fulfillment, OrderStatus } from "@/lib/types";

export function nextStatuses(status: OrderStatus, fulfillment: Fulfillment): OrderStatus[] {
  switch (status) {
    case "new":
      return ["accepted", "rejected"];
    case "accepted":
      return [fulfillment === "delivery" ? "on_the_way" : "ready", "rejected"];
    case "on_the_way":
    case "ready":
      return ["completed"];
    default:
      return [];
  }
}

export const STATUS_LABELS_ADMIN: Record<OrderStatus, string> = {
  new: "Új",
  accepted: "Elfogadva / Készül",
  on_the_way: "Kiszállítás alatt",
  ready: "Átvehető",
  completed: "Lezárva",
  rejected: "Elutasítva",
};

export const STATUS_LABELS_CUSTOMER: Record<OrderStatus, string> = {
  new: "Beérkezett",
  accepted: "Készül",
  on_the_way: "Kiszállítás alatt",
  ready: "Átvehető",
  completed: "Teljesítve",
  rejected: "Elutasítva",
};
