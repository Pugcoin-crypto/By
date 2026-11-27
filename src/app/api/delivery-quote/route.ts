import type { NextRequest } from "next/server";
import { findZone, findZoneByZip } from "@/lib/delivery";
import { getStore } from "@/server/store";

/** GET /api/delivery-quote?zip=2200[&city=Monor] → fee, minimum and ETA for that address. */
export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip")?.trim() ?? "";
  const city = request.nextUrl.searchParams.get("city")?.trim();
  if (!/^\d{4}$/.test(zip)) {
    return Response.json({ deliverable: false, error: "Az irányítószám 4 számjegy." }, { status: 400 });
  }
  const zones = await (await getStore()).getZones();
  const zone = city ? findZone(zones, zip, city) : findZoneByZip(zones, zip);
  if (!zone) {
    return Response.json({
      deliverable: false,
      error: "Erre a címre sajnos nem szállítunk.",
      cities: zones.filter((z) => z.active).map((z) => z.city),
    });
  }
  return Response.json({ deliverable: true, city: zone.city, fee: zone.fee, minOrderValue: zone.minOrderValue, etaMinutes: zone.etaMinutes });
}
