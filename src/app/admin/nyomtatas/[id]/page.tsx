import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PrintOnLoad } from "@/components/admin/print-on-load";
import { formatHungarianPhone } from "@/lib/phone";
import { describeModifiers, formatHuf } from "@/lib/pricing";
import { currentStaff } from "@/server/admin-auth";
import { getStore } from "@/server/store";

export const metadata: Metadata = { title: "Konyhai cetli", robots: { index: false } };

const fmt = new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Budapest", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

async function Ticket({ params }: { params: Promise<{ id: string }> }) {
  if (!(await currentStaff())) redirect("/admin/belepes");
  const { id } = await params;
  const order = await (await getStore()).getOrder(id);
  if (!order) return <p className="p-6">Nincs ilyen rendelés.</p>;

  return (
    <main className="ticket mx-auto w-[80mm] bg-white p-3 font-mono text-[13px] leading-snug text-black">
      <PrintOnLoad />
      <p className="text-center text-base font-bold">ERDEN&apos;S KEBAB · MONOR</p>
      <p className="mt-1 text-center text-2xl font-bold">{order.number}</p>
      <p className="text-center">{fmt.format(new Date(order.createdAt))}</p>
      <p className="mt-1 text-center text-lg font-bold">{order.fulfillment === "delivery" ? "KISZÁLLÍTÁS" : "ELVITEL"}</p>
      <p className="text-center">Kész: {fmt.format(new Date(order.etaAt))}</p>
      <hr className="my-2 border-dashed border-black" />
      {order.items.map((i, idx) => (
        <div key={idx} className="mb-2">
          <div className="flex justify-between gap-2">
            <span className="font-bold">
              {i.quantity}× {i.name}
            </span>
            <span>{formatHuf(i.lineTotal)}</span>
          </div>
          {describeModifiers(i).map((d) => (
            <div key={d} className="pl-3">
              - {d}
            </div>
          ))}
        </div>
      ))}
      {order.note && (
        <>
          <hr className="my-2 border-dashed border-black" />
          <p className="font-bold">MEGJEGYZÉS: {order.note}</p>
        </>
      )}
      <hr className="my-2 border-dashed border-black" />
      <div className="flex justify-between">
        <span>Részösszeg</span>
        <span>{formatHuf(order.subtotal)}</span>
      </div>
      {order.fulfillment === "delivery" && (
        <div className="flex justify-between">
          <span>Szállítás</span>
          <span>{formatHuf(order.deliveryFee)}</span>
        </div>
      )}
      <div className="flex justify-between text-base font-bold">
        <span>ÖSSZESEN</span>
        <span>{formatHuf(order.total)}</span>
      </div>
      <p>Fizetés: {order.paymentMethod === "cash" ? "KÉSZPÉNZ" : "BANKKÁRTYA"}</p>
      <hr className="my-2 border-dashed border-black" />
      <p className="font-bold">{order.customer.name}</p>
      <p>{formatHungarianPhone(order.customer.phone)}</p>
      {order.address && (
        <p>
          {order.address.zip} {order.address.city}, {order.address.street}
          {order.address.floor && `, ${order.address.floor}. em.`}
          {order.address.door && ` ${order.address.door}. ajtó`}
          {order.address.bell && `, csengő: ${order.address.bell}`}
        </p>
      )}
    </main>
  );
}

export default function PrintPage({ params }: PageProps<"/admin/nyomtatas/[id]">) {
  return (
    <Suspense fallback={null}>
      <Ticket params={params} />
    </Suspense>
  );
}
