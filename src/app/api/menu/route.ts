import { connection } from "next/server";
import { getPublicMenu } from "@/server/public-menu";

/** Public menu: active categories, products (sold-out ones flagged), options, zones and open state. */
export async function GET() {
  await connection();
  return Response.json(await getPublicMenu(), { headers: { "Cache-Control": "no-store" } });
}
