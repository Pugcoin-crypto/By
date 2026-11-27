import "server-only";
import { storeState } from "@/lib/hours";
import type { PublicMenu } from "@/lib/types";
import { getStore } from "./store";

export async function getPublicMenu(now = new Date()): Promise<PublicMenu> {
  const store = await getStore();
  const [catalog, settings, zones] = await Promise.all([store.getCatalog(), store.getSettings(), store.getZones()]);
  return {
    categories: catalog.categories.filter((c) => c.active),
    products: catalog.products,
    modifierGroups: catalog.modifierGroups,
    zones: zones
      .filter((z) => z.active)
      .map(({ id, city, postcodes, fee, minOrderValue, etaMinutes }) => ({ id, city, postcodes, fee, minOrderValue, etaMinutes })),
    store: {
      name: settings.name,
      phone: settings.phone,
      openingHours: settings.openingHours,
      minOrderValue: settings.minOrderValue,
      state: storeState(settings, now),
    },
  };
}
