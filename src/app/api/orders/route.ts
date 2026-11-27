import type { NextRequest } from "next/server";
import { placeOrder } from "@/server/place-order";
import { rateLimit } from "@/server/rate-limit";
import { getStore } from "@/server/store";

/** Places an order. The response only carries what the customer needs to follow it. */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`order:${ip}`, 5, 10 * 60_000)) {
    return Response.json({ error: "Túl sok rendelés rövid idő alatt. Kérjük, várj pár percet, vagy hívj minket telefonon." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Hibás kérés." }, { status: 400 });
  }

  const result = await placeOrder(body, await getStore());
  if (!result.ok) {
    const { status, error, field, productId } = result;
    return Response.json({ error, field, productId }, { status });
  }
  const { order } = result;
  return Response.json(
    { number: order.number, trackingToken: order.trackingToken, total: order.total, etaAt: order.etaAt },
    { status: 201 },
  );
}
