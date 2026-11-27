import type { Order } from "./types";

export interface PeriodStats {
  revenue: number;
  completedCount: number;
  orderCount: number;
  rejectedCount: number;
  averageBasket: number;
}

export interface StatsReport {
  today: PeriodStats;
  week: PeriodStats;
  byDay: { date: string; revenue: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
}

/** "YYYY-MM-DD" of an instant in the given time zone. */
export function localDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function period(orders: Order[]): PeriodStats {
  const completed = orders.filter((o) => o.status === "completed");
  const revenue = completed.reduce((s, o) => s + o.total, 0);
  return {
    revenue,
    completedCount: completed.length,
    orderCount: orders.filter((o) => o.status !== "rejected").length,
    rejectedCount: orders.filter((o) => o.status === "rejected").length,
    averageBasket: completed.length ? Math.round(revenue / completed.length) : 0,
  };
}

/**
 * Revenue counts completed orders only (money actually taken); order counts
 * include everything not rejected. `orders` should cover the last 7 days.
 */
export function buildStats(orders: Order[], now: Date, timeZone = "Europe/Budapest"): StatsReport {
  const today = localDate(now, timeZone);
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) days.push(localDate(new Date(now.getTime() - i * 86_400_000), timeZone));
  const inWeek = orders.filter((o) => days.includes(localDate(new Date(o.createdAt), timeZone)));
  const inToday = inWeek.filter((o) => localDate(new Date(o.createdAt), timeZone) === today);

  const items = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const o of inWeek) {
    if (o.status === "rejected") continue;
    for (const i of o.items) {
      const cur = items.get(i.productId) ?? { name: i.name, quantity: 0, revenue: 0 };
      cur.quantity += i.quantity;
      cur.revenue += i.lineTotal;
      items.set(i.productId, cur);
    }
  }

  return {
    today: period(inToday),
    week: period(inWeek),
    byDay: days.map((date) => {
      const d = inWeek.filter((o) => localDate(new Date(o.createdAt), timeZone) === date);
      return { date, revenue: period(d).revenue, orders: period(d).orderCount };
    }),
    topItems: [...items.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
  };
}
