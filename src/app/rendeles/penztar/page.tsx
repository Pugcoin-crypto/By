import type { Metadata } from "next";
import { Suspense } from "react";
import { Checkout } from "@/components/order/checkout";
import { MenuLoader, MenuSkeleton } from "@/components/order/menu-loader";

export const metadata: Metadata = { title: "Pénztár — Erdens Kebab Monor", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuLoader>
        <Checkout />
      </MenuLoader>
    </Suspense>
  );
}
