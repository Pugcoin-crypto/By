import type { DeliveryZone } from "./types";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Finds the active zone for an address. The postcode decides; the city must
 * match it so that a typo cannot move an address into a cheaper zone.
 */
export function findZone(zones: DeliveryZone[], zip: string, city: string): DeliveryZone | null {
  const z = zip.trim();
  return (
    zones.find((zone) => zone.active && zone.postcodes.includes(z) && norm(zone.city) === norm(city)) ?? null
  );
}

export function findZoneByZip(zones: DeliveryZone[], zip: string): DeliveryZone | null {
  const z = zip.trim();
  return zones.find((zone) => zone.active && zone.postcodes.includes(z)) ?? null;
}
