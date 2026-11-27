"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFirebaseApp } from "@/lib/client/firebase";
import { STATUS_LABELS_CUSTOMER } from "@/lib/order-status";
import { formatHungarianPhone } from "@/lib/phone";
import { formatHuf } from "@/lib/pricing";
import type { OrderStatus, OrderTracking } from "@/lib/types";
import { CheckIcon } from "./icons";

const POLL_MS = 15_000;

const timeFmt = new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Budapest", hour: "2-digit", minute: "2-digit" });

export function OrderTracker({ token, initial, phone }: { token: string; initial: OrderTracking | null; phone: string }) {
  const [tracking, setTracking] = useState(initial);

  useEffect(() => {
    if (!initial) return;
    let stop = () => {};
    const app = getFirebaseApp();
    if (app) {
      // Live updates straight from Firestore.
      void import("firebase/firestore").then(({ doc, getFirestore, onSnapshot }) => {
        stop = onSnapshot(doc(getFirestore(app), "orderTracking", token), (snap) => {
          if (snap.exists()) setTracking(snap.data() as OrderTracking);
        });
      });
    } else {
      const poll = async () => {
        if (document.hidden) return;
        const res = await fetch(`/api/orders/track/${token}`, { cache: "no-store" }).catch(() => null);
        if (res?.ok) setTracking((await res.json()) as OrderTracking);
      };
      const id = window.setInterval(poll, POLL_MS);
      document.addEventListener("visibilitychange", poll);
      stop = () => {
        window.clearInterval(id);
        document.removeEventListener("visibilitychange", poll);
      };
    }
    return () => stop();
  }, [token, initial]);

  if (!tracking) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Nem találjuk ezt a rendelést</h1>
        <p className="mt-2 text-white/70">Ellenőrizd a linket, vagy hívj minket: {formatHungarianPhone(phone)}</p>
        <Link href="/rendeles" className="mt-6 inline-flex h-12 items-center rounded-button bg-secondary px-6 font-bold text-white">
          Az étlaphoz
        </Link>
      </main>
    );
  }

  const steps: OrderStatus[] = ["new", "accepted", tracking.fulfillment === "delivery" ? "on_the_way" : "ready", "completed"];
  const currentIndex = steps.indexOf(tracking.status);
  const rejected = tracking.status === "rejected";
  const done = tracking.status === "completed";
  const eta = timeFmt.format(new Date(tracking.etaAt));

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-8 pb-16">
      <p className="text-text-custom-2">Rendelésszám</p>
      <h1 className="text-3xl font-bold">{tracking.number}</h1>

      {rejected ? (
        <div className="mt-6 rounded-card border border-red-400/40 bg-red-500/10 p-5" role="status">
          <p className="text-lg font-bold text-red-300">A rendelést sajnos nem tudjuk teljesíteni.</p>
          {tracking.rejectReason && <p className="mt-2 text-white/80">Indok: {tracking.rejectReason}</p>}
          <p className="mt-2 text-white/70">Kérdés esetén hívj minket: {formatHungarianPhone(phone)}</p>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-card bg-surface p-5">
            <p className="text-text-custom-2">
              {done ? "Jó étvágyat!" : tracking.fulfillment === "delivery" ? "Várható kiszállítás" : "Várhatóan átvehető"}
            </p>
            {!done && <p className="text-4xl font-bold tabular-nums">{eta}</p>}
            <p className="mt-1 text-sm text-text-custom-2" aria-live="polite">
              {STATUS_LABELS_CUSTOMER[tracking.status]}
            </p>
          </div>

          <ol className="mt-6 grid gap-0" aria-label="Rendelés állapota">
            {steps.map((s, i) => {
              const reached = i <= currentIndex;
              const current = i === currentIndex && !done;
              return (
                <li key={s} className="relative flex items-center gap-4 pb-6 last:pb-0">
                  {i < steps.length - 1 && (
                    <span className={`absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 ${i < currentIndex ? "bg-secondary" : "bg-white/15"}`} />
                  )}
                  <span
                    className={`relative grid size-8 shrink-0 place-items-center rounded-full border-2 ${
                      reached ? "border-secondary bg-secondary text-white" : "border-white/20 text-white/30"
                    } ${current ? "ring-4 ring-secondary/30" : ""}`}
                  >
                    {reached ? <CheckIcon width={16} height={16} strokeWidth={3} /> : <span className="text-sm">{i + 1}</span>}
                  </span>
                  <span className={reached ? "font-bold" : "text-white/50"}>{STATUS_LABELS_CUSTOMER[s]}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <section className="mt-8 rounded-card bg-surface p-5">
        <h2 className="font-bold">A rendelésed</h2>
        <ul className="mt-3 divide-y divide-white/10">
          {tracking.items.map((it, i) => (
            <li key={i} className="py-2">
              <p>
                {it.quantity} × {it.name}
              </p>
              {it.details.length > 0 && <p className="text-sm text-text-custom-2">{it.details.join(" · ")}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-white/10 pt-3 text-lg font-bold">
          <span>Összesen</span>
          <span className="tabular-nums">{formatHuf(tracking.total)}</span>
        </p>
      </section>

      <p className="mt-6 text-center text-sm text-text-custom-2">
        Ezt az oldalt elmentheted, a státusz magától frissül. Kérdésed van? Hívj: <a className="underline" href={`tel:${phone}`}>{formatHungarianPhone(phone)}</a>
      </p>
      <Link href="/rendeles" className="mt-6 flex h-12 items-center justify-center rounded-button bg-surface-2 font-bold">
        Új rendelés
      </Link>
    </main>
  );
}
