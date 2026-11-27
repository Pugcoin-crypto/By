import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrderTracker } from "@/components/order/order-tracker";
import { getStore } from "@/server/store";

export const metadata: Metadata = { title: "Rendelés követése — Erdens Kebab Monor", robots: { index: false } };

async function TrackingLoader({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const store = await getStore();
  const [tracking, settings] = await Promise.all([
    /^[A-Za-z0-9_-]{20,64}$/.test(token) ? store.getTracking(token) : null,
    store.getSettings(),
  ]);
  return <OrderTracker token={token} initial={tracking} phone={settings.phone} />;
}

export default function TrackingPage({ params }: PageProps<"/rendeles/kovetes/[token]">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-16 h-64 w-full max-w-xl animate-pulse rounded-card bg-surface" />}>
      <TrackingLoader params={params} />
    </Suspense>
  );
}
