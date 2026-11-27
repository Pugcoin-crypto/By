// Loads the starting menu, settings and delivery zones into Firestore.
//   npm run seed            → only fills an empty database
//   npm run seed -- --force → overwrites the menu documents with the seed
// Needs the same FIREBASE_* variables as the app (see .env.example).
// The app also does this by itself on its first request to an empty database.

import { seedCatalog, seedZones } from "../src/lib/menu-seed";
import { seedFirestore } from "../src/server/firestore-seed";
import { getAdminDb } from "../src/server/store-firestore";

async function main() {
  const wrote = await seedFirestore(getAdminDb(), process.argv.includes("--force"));
  if (!wrote) {
    console.log("Már van étlap az adatbázisban. Felülíráshoz: npm run seed -- --force");
    return;
  }
  console.log(
    `Kész: ${seedCatalog.categories.length} kategória, ${seedCatalog.products.length} termék, ` +
      `${seedCatalog.modifierGroups.length} opciócsoport, ${seedZones.length} szállítási zóna.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
