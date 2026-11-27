import { beforeEach, describe, expect, it } from "vitest";
import { seedCatalog, seedSettings, seedZones } from "@/lib/menu-seed";
import { placeOrder } from "./place-order";
import type { Store } from "./store";
import { createMemoryStore } from "./store-memory";

const OPEN = new Date("2026-11-27T12:00:00Z"); // Friday 13:00 in Budapest
let store: Store;

beforeEach(() => {
  store = createMemoryStore({ catalog: seedCatalog, settings: seedSettings, zones: seedZones });
});

const base = {
  fulfillment: "delivery" as const,
  customer: { name: "Teszt Elek", phone: "06 30 123 4567" },
  address: { zip: "2213", city: "Monorierdő", street: "Fő utca 1.", floor: "2", door: "5", bell: "Elek" },
  paymentMethod: "cash" as const,
  items: [{ productId: "sima-durum", quantity: 2, selections: { hus: ["borju"] } }],
};

describe("placeOrder", () => {
  it("computes the total on the server and adds the 800 Ft delivery fee", async () => {
    const r = await placeOrder({ ...base, total: 1 }, store, OPEN);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.subtotal).toBe(2 * 2980);
    expect(r.order.deliveryFee).toBe(800);
    expect(r.order.total).toBe(2 * 2980 + 800);
    expect(r.order.number).toBe("EK-1001");
    expect(r.order.customer.phone).toBe("+36301234567");
    expect(r.order.status).toBe("new");
  });

  it("delivers free within Monor and numbers orders sequentially", async () => {
    await placeOrder(base, store, OPEN);
    const r = await placeOrder({ ...base, address: { ...base.address, zip: "2200", city: "Monor" } }, store, OPEN);
    expect(r.ok && r.order.deliveryFee).toBe(0);
    expect(r.ok && r.order.number).toBe("EK-1002");
  });

  it("pickup needs no address and has no fee", async () => {
    const r = await placeOrder({ ...base, fulfillment: "pickup", address: undefined }, store, OPEN);
    expect(r.ok && r.order.deliveryFee).toBe(0);
    expect(r.ok && r.order.address).toBeUndefined();
  });

  it("refuses addresses outside the zones, or a city that doesn't match the postcode", async () => {
    const far = await placeOrder({ ...base, address: { ...base.address, zip: "1051", city: "Budapest" } }, store, OPEN);
    expect(far).toMatchObject({ ok: false, status: 400, field: "address.zip" });
    const mismatch = await placeOrder({ ...base, address: { ...base.address, zip: "2200", city: "Gomba" } }, store, OPEN);
    expect(mismatch.ok).toBe(false);
  });

  it("refuses orders when closed or paused", async () => {
    const closed = await placeOrder(base, store, new Date("2026-11-27T21:00:00Z"));
    expect(closed).toMatchObject({ ok: false, status: 409 });

    const paused = createMemoryStore({ catalog: seedCatalog, settings: { ...seedSettings, acceptingOrders: false }, zones: seedZones });
    expect(await placeOrder(base, paused, OPEN)).toMatchObject({ ok: false, status: 409 });
  });

  it("enforces the minimum order value", async () => {
    const s = createMemoryStore({ catalog: seedCatalog, settings: { ...seedSettings, minOrderValue: 10000 }, zones: seedZones });
    const r = await placeOrder(base, s, OPEN);
    expect(r).toMatchObject({ ok: false, status: 400 });
    if (!r.ok) expect(r.error).toContain("10 000 Ft");
  });

  it("validates phone and honeypot", async () => {
    expect(await placeOrder({ ...base, customer: { name: "X Y", phone: "12345" } }, store, OPEN)).toMatchObject({
      ok: false,
      field: "customer.phone",
    });
    expect((await placeOrder({ ...base, website: "spam" }, store, OPEN)).ok).toBe(false);
  });

  it("requires an address for delivery", async () => {
    expect(await placeOrder({ ...base, address: undefined }, store, OPEN)).toMatchObject({ ok: false, field: "address" });
  });

  it("exposes a PII-free tracking view by token", async () => {
    const r = await placeOrder(base, store, OPEN);
    if (!r.ok) throw new Error(r.error);
    const t = await store.getTracking(r.order.trackingToken);
    expect(t).toMatchObject({ number: "EK-1001", status: "new", total: r.order.total });
    expect(JSON.stringify(t)).not.toContain("Teszt");
    expect(JSON.stringify(t)).not.toContain("Fő utca");
    expect(await store.getTracking("x".repeat(24))).toBeNull();
  });
});
