import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuLoader, MenuSkeleton } from "@/components/order/menu-loader";
import { OrderMenu } from "@/components/order/order-menu";

export const metadata: Metadata = {
  title: "Online rendelés — Erdens Kebab Monor",
  description: "Kebab tál, dürüm, pita, falafel, baklava. Házhozszállítás Monoron ingyen, a környékre 800 Ft-ért.",
};

export default function OrderPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuLoader>
        <OrderMenu />
      </MenuLoader>
    </Suspense>
  );
}
