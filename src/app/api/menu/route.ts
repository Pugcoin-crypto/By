import { connection } from "next/server";
import { storeState } from "@/lib/hours";
import { getStore } from "@/server/store";

/** Public menu: active categories, products (sold-out ones flagged), options, zones and open state. */
export async function GET() {
  await connection();
  const store = await getStore();
  const [catalog, settings, zones] = await Promise.all([store.getCatalog(), store.getSettings(), store.getZones()]);
  return Response.json(
    {
      categories: catalog.categories.filter((c) => c.active),
      products: catalog.products,
      modifierGroups: catalog.modifierGroups,
      zones: zones.filter((z) => z.active).map(({ id, city, postcodes, fee, minOrderValue, etaMinutes }) => ({ id, city, postcodes, fee, minOrderValue, etaMinutes })),
      store: {
        name: settings.name,
        phone: settings.phone,
        openingHours: settings.openingHours,
        minOrderValue: settings.minOrderValue,
        state: storeState(settings, new Date()),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
