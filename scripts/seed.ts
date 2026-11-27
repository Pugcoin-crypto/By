// Loads the starting menu, settings and delivery zones into Firestore.
//   npm run seed            → only fills empty collections
//   npm run seed -- --force → overwrites the menu documents with the seed
// Needs the same FIREBASE_* variables as the app (see .env.example).

import { seedCatalog, seedSettings, seedZones } from "../src/lib/menu-seed";
import { COLLECTIONS, getAdminDb } from "../src/server/store-firestore";

async function main() {
  const force = process.argv.includes("--force");
  const db = getAdminDb();

  const existing = await db.collection(COLLECTIONS.products).limit(1).get();
  if (!existing.empty && !force) {
    console.log("Már van étlap az adatbázisban. Felülíráshoz: npm run seed -- --force");
    return;
  }

  const batch = db.batch();
  for (const c of seedCatalog.categories) batch.set(db.collection(COLLECTIONS.categories).doc(c.id), c);
  for (const p of seedCatalog.products) batch.set(db.collection(COLLECTIONS.products).doc(p.id), p);
  for (const g of seedCatalog.modifierGroups) batch.set(db.collection(COLLECTIONS.modifierGroups).doc(g.id), g);
  for (const z of seedZones) batch.set(db.collection(COLLECTIONS.deliveryZones).doc(z.id), z);
  batch.set(db.collection(COLLECTIONS.settings).doc("store"), seedSettings, { merge: !force });
  await batch.commit();

  console.log(
    `Kész: ${seedCatalog.categories.length} kategória, ${seedCatalog.products.length} termék, ` +
      `${seedCatalog.modifierGroups.length} opciócsoport, ${seedZones.length} szállítási zóna.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
