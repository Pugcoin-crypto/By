"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { DeliveryZone, StoreSettings } from "@/lib/types";
import { adminFetch } from "./api";
import { Switch } from "./switch";

const DAYS = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // show Monday first

export function SettingsForm({ settings, zones }: { settings: StoreSettings; zones: DeliveryZone[] }) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [status, setStatus] = useState<string | null>(null);

  const setDay = (day: number, open: string, close: string, closed: boolean) =>
    setS((x) => ({
      ...x,
      openingHours: x.openingHours.map((d, i) => (i === day ? { intervals: closed ? [] : [{ open, close }] } : d)),
    }));

  const save = async () => {
    setStatus(null);
    try {
      await adminFetch("/api/admin/settings", {
        method: "PATCH",
        body: {
          acceptingOrders: s.acceptingOrders,
          pauseMessage: s.pauseMessage ?? "",
          openingHours: s.openingHours,
          minOrderValue: s.minOrderValue,
          defaultEtaMinutes: s.defaultEtaMinutes,
          pickupEtaMinutes: s.pickupEtaMinutes,
        },
      });
      setStatus("Mentve");
      router.refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Hiba");
    }
  };

  const num = "h-11 w-28 rounded-button bg-surface-2 px-3 text-right tabular-nums";

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-bold">Beállítások</h1>

      <Card title="Rendelésfogadás">
        <Switch checked={s.acceptingOrders} onChange={(v) => setS({ ...s, acceptingOrders: v })} label={s.acceptingOrders ? "Fogadunk online rendelést" : "Szünetel"} />
        <label className="grid gap-1.5">
          <span className="text-sm text-white/80">Üzenet szünet idejére</span>
          <input value={s.pauseMessage ?? ""} onChange={(e) => setS({ ...s, pauseMessage: e.target.value })} className="h-11 rounded-button bg-surface-2 px-3" placeholder="Nagy a forgalom, kb. 30 perc múlva újra rendelhetsz." />
        </label>
      </Card>

      <Card title="Nyitvatartás (online rendelés)">
        <div className="grid gap-2">
          {ORDER.map((day) => {
            const iv = s.openingHours[day]?.intervals[0];
            const closed = !iv;
            return (
              <div key={day} className="flex flex-wrap items-center gap-3">
                <span className="w-24">{DAYS[day]}</span>
                <input type="time" disabled={closed} value={iv?.open ?? "10:30"} onChange={(e) => setDay(day, e.target.value, iv?.close ?? "20:00", false)} className="h-10 rounded-button bg-surface-2 px-2 disabled:opacity-30" aria-label={`${DAYS[day]} nyitás`} />
                <span>–</span>
                <input type="time" disabled={closed} value={iv?.close ?? "20:00"} onChange={(e) => setDay(day, iv?.open ?? "10:30", e.target.value, false)} className="h-10 rounded-button bg-surface-2 px-2 disabled:opacity-30" aria-label={`${DAYS[day]} zárás`} />
                <Switch checked={!closed} onChange={(v) => setDay(day, iv?.open ?? "10:30", iv?.close ?? "20:00", !v)} label={closed ? "Zárva" : "Nyitva"} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Rendelés">
        <Row label="Minimális rendelési érték (Ft, 0 = nincs)">
          <input type="number" min={0} step={100} value={s.minOrderValue} onChange={(e) => setS({ ...s, minOrderValue: Number(e.target.value) })} className={num} />
        </Row>
        <Row label="Alap kiszállítási idő (perc)">
          <input type="number" min={5} value={s.defaultEtaMinutes} onChange={(e) => setS({ ...s, defaultEtaMinutes: Number(e.target.value) })} className={num} />
        </Row>
        <Row label="Elvitel elkészítési idő (perc)">
          <input type="number" min={5} value={s.pickupEtaMinutes} onChange={(e) => setS({ ...s, pickupEtaMinutes: Number(e.target.value) })} className={num} />
        </Row>
      </Card>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} className="h-12 rounded-button bg-secondary px-6 font-bold text-white">
          Mentés
        </button>
        {status && <span className={status === "Mentve" ? "text-green-400" : "text-red-300"}>{status}</span>}
      </div>

      <Card title="Szállítási zónák">
        <div className="grid gap-3">
          {zones.map((z) => (
            <ZoneRow key={z.id} zone={z} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function ZoneRow({ zone }: { zone: DeliveryZone }) {
  const [z, setZ] = useState(zone);
  const [status, setStatus] = useState<string | null>(null);
  const save = async () => {
    try {
      await adminFetch(`/api/admin/zones/${z.id}`, { method: "PUT", body: z });
      setStatus("Mentve");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Hiba");
    }
  };
  const num = "h-10 w-24 rounded-button bg-surface-2 px-2 text-right tabular-nums";
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-3">
      <span className="w-36 font-bold">
        {z.postcodes.join(", ")} {z.city}
      </span>
      <label className="flex items-center gap-1 text-sm">
        Díj <input type="number" min={0} step={100} value={z.fee} onChange={(e) => (setZ({ ...z, fee: Number(e.target.value) }), setStatus(null))} className={num} /> Ft
      </label>
      <label className="flex items-center gap-1 text-sm">
        Min. <input type="number" min={0} step={100} value={z.minOrderValue} onChange={(e) => (setZ({ ...z, minOrderValue: Number(e.target.value) }), setStatus(null))} className={num} /> Ft
      </label>
      <label className="flex items-center gap-1 text-sm">
        <input type="number" min={5} value={z.etaMinutes} onChange={(e) => (setZ({ ...z, etaMinutes: Number(e.target.value) }), setStatus(null))} className={num} /> perc
      </label>
      <Switch checked={z.active} onChange={(v) => (setZ({ ...z, active: v }), setStatus(null))} label={z.active ? "Aktív" : "Szünetel"} />
      <button onClick={save} className="h-10 rounded-button bg-surface-2 px-3 text-sm font-bold">
        Mentés
      </button>
      {status && <span className={`text-sm ${status === "Mentve" ? "text-green-400" : "text-red-300"}`}>{status}</span>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 grid gap-4 rounded-card bg-surface p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-white/80">{label}</span>
      {children}
    </label>
  );
}
