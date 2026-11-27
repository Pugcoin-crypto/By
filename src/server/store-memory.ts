import "server-only";
import { seedCatalog, seedSettings, seedZones } from "@/lib/menu-seed";
import type { Catalog, DeliveryZone, Order, StoreSettings } from "@/lib/types";
import type { NewOrder, Store } from "./store";
import { FIRST_ORDER_NUMBER, formatOrderNumber, toTracking } from "./tracking";

interface MemoryState {
  catalog: Catalog;
  settings: StoreSettings;
  zones: DeliveryZone[];
  orders: Map<string, Order>;
  byToken: Map<string, string>;
  next: number;
}

const clone = <T,>(v: T): T => structuredClone(v);

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item;
  else list.push(item);
}

// Survives Next.js dev hot reloads.
const g = globalThis as unknown as { __erdensMemoryState?: MemoryState };

export function createMemoryStore(initial?: Partial<Pick<MemoryState, "catalog" | "settings" | "zones">>): Store {
  const state: MemoryState =
    !initial && g.__erdensMemoryState
      ? g.__erdensMemoryState
      : {
          catalog: clone(initial?.catalog ?? seedCatalog),
          settings: clone(initial?.settings ?? seedSettings),
          zones: clone(initial?.zones ?? seedZones),
          orders: new Map(),
          byToken: new Map(),
          next: FIRST_ORDER_NUMBER,
        };
  if (!initial) g.__erdensMemoryState = state;

  return {
    kind: "memory",
    async getCatalog() {
      return clone(state.catalog);
    },
    async getSettings() {
      return clone(state.settings);
    },
    async getZones() {
      return clone(state.zones);
    },
    async createOrder(draft: NewOrder) {
      const order: Order = { ...clone(draft), id: crypto.randomUUID(), number: formatOrderNumber(state.next++) };
      state.orders.set(order.id, order);
      state.byToken.set(order.trackingToken, order.id);
      return clone(order);
    },
    async getOrder(id) {
      const o = state.orders.get(id);
      return o ? clone(o) : null;
    },
    async getTracking(token) {
      const id = state.byToken.get(token);
      const o = id ? state.orders.get(id) : undefined;
      return o ? toTracking(o) : null;
    },
    async listOrdersSince(sinceIso) {
      return [...state.orders.values()]
        .filter((o) => o.createdAt >= sinceIso)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(clone);
    },
    async updateOrder(id, expectedStatus, patch) {
      const o = state.orders.get(id);
      if (!o || o.status !== expectedStatus) return null;
      Object.assign(o, clone(patch));
      return clone(o);
    },
    async saveProduct(product) {
      upsert(state.catalog.products, clone(product));
    },
    async setProductAvailable(id, available) {
      const p = state.catalog.products.find((x) => x.id === id);
      if (!p) return false;
      p.available = available;
      return true;
    },
    async deleteProduct(id) {
      state.catalog.products = state.catalog.products.filter((p) => p.id !== id);
    },
    async saveCategory(category) {
      upsert(state.catalog.categories, clone(category));
      state.catalog.categories.sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async saveModifierGroup(group) {
      upsert(state.catalog.modifierGroups, clone(group));
    },
    async saveZone(zone) {
      upsert(state.zones, clone(zone));
    },
    async updateSettings(patch) {
      state.settings = { ...state.settings, ...clone(patch) };
      return clone(state.settings);
    },
  };
}
