import { beforeEach, describe, expect, it, vi } from "vitest";
import { seedCatalog, seedSettings, seedZones } from "@/lib/menu-seed";
import { buildStats } from "@/lib/stats";
import { changeOrderStatus, setOrderEta } from "./admin-orders";
import { placeOrder } from "./place-order";
import type { Store } from "./store";
import { createMemoryStore } from "./store-memory";

const NOW = new Date("2026-11-27T12:00:00Z");
let store: Store;
const order = {
  fulfillment: "delivery",
  customer: { name: "Teszt Elek", phone: "06301234567" },
  address: { zip: "2200", city: "Monor", street: "Fő u. 1" },
  paymentMethod: "cash",
  items: [{ productId: "sima-durum", quantity: 1, selections: { hus: ["csirke"] } }],
};

async function newOrder(body: object = order) {
  const r = await placeOrder(body, store, NOW);
  if (!r.ok) throw new Error(r.error);
  return r.order;
}

beforeEach(() => {
  store = createMemoryStore({ catalog: seedCatalog, settings: seedSettings, zones: seedZones });
});

describe("changeOrderStatus", () => {
  it("walks a delivery order through accepted → on_the_way → completed and updates tracking", async () => {
    const o = await newOrder();
    const later = new Date(NOW.getTime() + 5 * 60_000);
    const a = await changeOrderStatus(store, o.id, { from: "new", to: "accepted", etaMinutes: 30 }, "pult", later);
    expect(a.ok && a.order.etaAt).toBe(new Date(later.getTime() + 30 * 60_000).toISOString());
    expect((await changeOrderStatus(store, o.id, { from: "accepted", to: "on_the_way" }, "pult")).ok).toBe(true);
    const c = await changeOrderStatus(store, o.id, { from: "on_the_way", to: "completed" }, "pult");
    expect(c.ok && c.order.paymentStatus).toBe("paid");
    expect(c.ok && c.order.statusHistory.map((h) => h.status)).toEqual(["new", "accepted", "on_the_way", "completed"]);
    expect((await store.getTracking(o.trackingToken))?.status).toBe("completed");
  });

  it("uses 'ready' for pickup and refuses 'on_the_way'", async () => {
    const o = await newOrder({ ...order, fulfillment: "pickup", address: undefined });
    await changeOrderStatus(store, o.id, { from: "new", to: "accepted" }, "x");
    expect(await changeOrderStatus(store, o.id, { from: "accepted", to: "on_the_way" }, "x")).toMatchObject({ ok: false, status: 400 });
    expect((await changeOrderStatus(store, o.id, { from: "accepted", to: "ready" }, "x")).ok).toBe(true);
  });

  it("rejects with a reason only, and shows it on tracking", async () => {
    const o = await newOrder();
    expect(await changeOrderStatus(store, o.id, { from: "new", to: "rejected" }, "x")).toMatchObject({ ok: false, status: 400 });
    expect((await changeOrderStatus(store, o.id, { from: "new", to: "rejected", rejectReason: "Elfogyott a hús" }, "x")).ok).toBe(true);
    expect(await store.getTracking(o.trackingToken)).toMatchObject({ status: "rejected", rejectReason: "Elfogyott a hús" });
  });

  it("detects a stale 'from' (two devices clicking at once)", async () => {
    const o = await newOrder();
    await changeOrderStatus(store, o.id, { from: "new", to: "accepted" }, "a");
    expect(await changeOrderStatus(store, o.id, { from: "new", to: "rejected", rejectReason: "xx" }, "b")).toMatchObject({ ok: false, status: 409 });
  });

  it("cannot skip steps or reopen closed orders", async () => {
    const o = await newOrder();
    expect((await changeOrderStatus(store, o.id, { from: "new", to: "completed" }, "x")).ok).toBe(false);
    await changeOrderStatus(store, o.id, { from: "new", to: "rejected", rejectReason: "xx" }, "x");
    expect((await changeOrderStatus(store, o.id, { from: "rejected", to: "accepted" }, "x")).ok).toBe(false);
    expect((await setOrderEta(store, o.id, 45)).ok).toBe(false);
  });
});

describe("buildStats", () => {
  it("counts revenue from completed orders, in Budapest days", async () => {
    const a = await newOrder();
    const b = await newOrder();
    const c = await newOrder();
    await changeOrderStatus(store, a.id, { from: "new", to: "accepted" }, "x");
    await changeOrderStatus(store, a.id, { from: "accepted", to: "on_the_way" }, "x");
    await changeOrderStatus(store, a.id, { from: "on_the_way", to: "completed" }, "x");
    await changeOrderStatus(store, b.id, { from: "new", to: "rejected", rejectReason: "xx" }, "x");
    void c;
    const s = buildStats(await store.listOrdersSince("2026-01-01"), NOW);
    expect(s.today).toMatchObject({ revenue: 2480, completedCount: 1, orderCount: 2, rejectedCount: 1, averageBasket: 2480 });
    expect(s.byDay).toHaveLength(7);
    expect(s.byDay.at(-1)).toMatchObject({ date: "2026-11-27", revenue: 2480, orders: 2 });
    expect(s.topItems[0]).toMatchObject({ name: "Sima dürüm", quantity: 2 });
  });
});

describe("dev admin session", () => {
  it("signs and verifies the cookie, rejects tampering and wrong passwords", async () => {
    vi.stubEnv("ADMIN_DEV_PASSWORD", "titok123");
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret");
    const { createSession, verifySession } = await import("./admin-auth");
    expect(await createSession({ password: "rossz" })).toMatchObject({ ok: false });
    const r = await createSession({ password: "titok123" });
    if (!r.ok) throw new Error(r.error);
    expect(await verifySession(r.value)).toMatchObject({ role: "admin" });
    const [payload, mac] = r.value.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "x", email: "x", role: "admin", exp: Date.now() + 1e9 })).toString("base64url");
    expect(await verifySession(`${forged}.${mac}`)).toBeNull();
    expect(await verifySession(`${payload}.AAAA`)).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
    vi.unstubAllEnvs();
  });
});
