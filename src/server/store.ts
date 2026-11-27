// Data access. Two implementations share one interface:
// - Firestore (production), when Firebase Admin credentials are configured;
// - in-memory with the seed menu, for local development and tests.

import "server-only";
import type { Catalog, Category, DeliveryZone, ModifierGroup, Order, OrderStatus, OrderTracking, Product, StoreSettings } from "@/lib/types";

export type NewOrder = Omit<Order, "id" | "number">;

export interface OrderPatch {
  status?: OrderStatus;
  etaMinutes?: number;
  etaAt?: string;
  rejectReason?: string;
  paymentStatus?: Order["paymentStatus"];
  statusHistory?: Order["statusHistory"];
}

export interface Store {
  readonly kind: "firestore" | "memory";
  getCatalog(): Promise<Catalog>;
  getSettings(): Promise<StoreSettings>;
  getZones(): Promise<DeliveryZone[]>;
  /** Assigns the next order number atomically and writes the public tracking view. */
  createOrder(order: NewOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  getTracking(token: string): Promise<OrderTracking | null>;
  listOrdersSince(sinceIso: string): Promise<Order[]>;
  /** Applies `patch` if `expectedStatus` still holds; returns the new order or null on conflict. */
  updateOrder(id: string, expectedStatus: OrderStatus, patch: OrderPatch): Promise<Order | null>;

  // Admin: menu and settings.
  saveProduct(product: Product): Promise<void>;
  setProductAvailable(id: string, available: boolean): Promise<boolean>;
  deleteProduct(id: string): Promise<void>;
  saveCategory(category: Category): Promise<void>;
  saveModifierGroup(group: ModifierGroup): Promise<void>;
  saveZone(zone: DeliveryZone): Promise<void>;
  updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings>;
}

let instance: Store | undefined;

export async function getStore(): Promise<Store> {
  if (instance) return instance;
  if (hasFirebaseCredentials()) {
    const { createFirestoreStore } = await import("./store-firestore");
    instance = createFirestoreStore();
  } else {
    const { createMemoryStore } = await import("./store-memory");
    instance = createMemoryStore();
  }
  return instance;
}

export function hasFirebaseCredentials(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
      (process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_PROJECT_ID),
  );
}
