import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { currentStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";

export const metadata: Metadata = { title: "Admin — Erdens Kebab", robots: { index: false } };

async function Guard({ children }: { children: ReactNode }) {
  const staff = await currentStaff();
  if (!staff) redirect("/admin/belepes");
  const settings = await (await getStore()).getSettings();
  return (
    <AdminShell staff={staff} acceptingOrders={settings.acceptingOrders} pauseMessage={settings.pauseMessage ?? ""}>
      {children}
    </AdminShell>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="p-6 text-white/60">Betöltés…</div>}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}
