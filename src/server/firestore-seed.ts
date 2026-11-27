import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { seedCatalog, seedSettings, seedZones } from "@/lib/menu-seed";
import { COLLECTIONS } from "./store-firestore";

/**
 * Writes the starting menu, settings and delivery zones.
 * Without `force` it does nothing when the store settings already exist.
 * Returns true when it wrote anything.
 */
export async function seedFirestore(db: Firestore, force = false): Promise<boolean> {
  const settingsRef = db.collection(COLLECTIONS.settings).doc("store");
  if (!force && (await settingsRef.get()).exists) return false;

  const batch = db.batch();
  for (const c of seedCatalog.categories) batch.set(db.collection(COLLECTIONS.categories).doc(c.id), c);
  for (const p of seedCatalog.products) batch.set(db.collection(COLLECTIONS.products).doc(p.id), p);
  for (const g of seedCatalog.modifierGroups) batch.set(db.collection(COLLECTIONS.modifierGroups).doc(g.id), g);
  for (const z of seedZones) batch.set(db.collection(COLLECTIONS.deliveryZones).doc(z.id), z);
  batch.set(settingsRef, seedSettings);
  await batch.commit();
  return true;
}
