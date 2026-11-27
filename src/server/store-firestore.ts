import "server-only";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { Catalog, Category, DeliveryZone, ModifierGroup, Order, OrderTracking, Product, StoreSettings } from "@/lib/types";
import type { NewOrder, Store } from "./store";
import { FIRST_ORDER_NUMBER, formatOrderNumber, toTracking } from "./tracking";

export const COLLECTIONS = {
  settings: "settings",
  categories: "categories",
  products: "products",
  modifierGroups: "modifierGroups",
  deliveryZones: "deliveryZones",
  orders: "orders",
  orderTracking: "orderTracking",
  counters: "counters",
} as const;

export function getAdminDb(): Firestore {
  if (!getApps().length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (json) {
      const decoded = json.trim().startsWith("{") ? json : Buffer.from(json, "base64").toString("utf8");
      initializeApp({ credential: cert(JSON.parse(decoded) as ServiceAccount) });
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    } else {
      // Emulator: FIRESTORE_EMULATOR_HOST + FIREBASE_PROJECT_ID.
      initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
    }
  }
  return getFirestore();
}

const withId = <T,>(d: FirebaseFirestore.QueryDocumentSnapshot): T => ({ ...(d.data() as object), id: d.id }) as T;

export function createFirestoreStore(): Store {
  const db = getAdminDb();
  const C = COLLECTIONS;

  // An empty database gets the starting menu on the first request, so a new
  // deployment works without running `npm run seed` by hand.
  let seeded: Promise<unknown> | null = null;
  const ensureSeeded = () =>
    (seeded ??= import("./firestore-seed")
      .then(({ seedFirestore }) => seedFirestore(db))
      .catch((e) => {
        seeded = null;
        throw e;
      }));

  return {
    kind: "firestore",
    async getCatalog(): Promise<Catalog> {
      await ensureSeeded();
      const [cats, prods, groups] = await Promise.all([
        db.collection(C.categories).get(),
        db.collection(C.products).get(),
        db.collection(C.modifierGroups).get(),
      ]);
      return {
        categories: cats.docs.map((d) => withId<Category>(d)).sort((a, b) => a.sortOrder - b.sortOrder),
        products: prods.docs.map((d) => withId<Product>(d)).sort((a, b) => a.sortOrder - b.sortOrder),
        modifierGroups: groups.docs.map((d) => withId<ModifierGroup>(d)),
      };
    },
    async getSettings() {
      await ensureSeeded();
      const snap = await db.collection(C.settings).doc("store").get();
      if (!snap.exists) throw new Error("settings/store hiányzik – futtasd a seed szkriptet.");
      return snap.data() as StoreSettings;
    },
    async getZones() {
      await ensureSeeded();
      const snap = await db.collection(C.deliveryZones).get();
      return snap.docs.map((d) => withId<DeliveryZone>(d));
    },
    async createOrder(draft: NewOrder) {
      const orderRef = db.collection(C.orders).doc();
      const counterRef = db.collection(C.counters).doc("orders");
      const trackingRef = db.collection(C.orderTracking).doc(draft.trackingToken);
      return db.runTransaction(async (tx) => {
        const counter = await tx.get(counterRef);
        const n = counter.exists ? (counter.get("next") as number) : FIRST_ORDER_NUMBER;
        const order: Order = { ...draft, id: orderRef.id, number: formatOrderNumber(n) };
        tx.set(counterRef, { next: n + 1 }, { merge: true });
        tx.set(orderRef, stripUndefined(order));
        tx.set(trackingRef, stripUndefined(toTracking(order)));
        return order;
      });
    },
    async getOrder(id) {
      const snap = await db.collection(C.orders).doc(id).get();
      return snap.exists ? ({ ...(snap.data() as Order), id: snap.id }) : null;
    },
    async getTracking(token) {
      const snap = await db.collection(C.orderTracking).doc(token).get();
      return snap.exists ? (snap.data() as OrderTracking) : null;
    },
    async listOrdersSince(sinceIso) {
      const snap = await db.collection(C.orders).where("createdAt", ">=", sinceIso).orderBy("createdAt", "desc").get();
      return snap.docs.map((d) => withId<Order>(d));
    },
    async updateOrder(id, expectedStatus, patch) {
      const ref = db.collection(C.orders).doc(id);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return null;
        const current = { ...(snap.data() as Order), id: snap.id };
        if (current.status !== expectedStatus) return null;
        const next: Order = { ...current, ...patch };
        tx.set(ref, stripUndefined(next));
        tx.set(db.collection(C.orderTracking).doc(current.trackingToken), stripUndefined(toTracking(next)));
        return next;
      });
    },
    async saveProduct(product) {
      await db.collection(C.products).doc(product.id).set(stripUndefined(product));
    },
    async setProductAvailable(id, available) {
      const ref = db.collection(C.products).doc(id);
      if (!(await ref.get()).exists) return false;
      await ref.update({ available });
      return true;
    },
    async deleteProduct(id) {
      await db.collection(C.products).doc(id).delete();
    },
    async saveCategory(category) {
      await db.collection(C.categories).doc(category.id).set(stripUndefined(category));
    },
    async saveModifierGroup(group) {
      await db.collection(C.modifierGroups).doc(group.id).set(stripUndefined(group));
    },
    async saveZone(zone) {
      await db.collection(C.deliveryZones).doc(zone.id).set(stripUndefined(zone));
    },
    async updateSettings(patch) {
      const ref = db.collection(C.settings).doc("store");
      await ref.set(stripUndefined(patch), { merge: true });
      return (await ref.get()).data() as StoreSettings;
    },
  };
}

/** Firestore rejects `undefined` values. */
function stripUndefined<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
