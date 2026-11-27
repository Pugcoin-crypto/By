"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFirebaseApp } from "@/lib/client/firebase";
import { nextStatuses, STATUS_LABELS_ADMIN } from "@/lib/order-status";
import { formatHungarianPhone } from "@/lib/phone";
import { describeModifiers, formatHuf } from "@/lib/pricing";
import type { Order, OrderStatus } from "@/lib/types";
import { adminFetch } from "./api";

const POLL_MS = 5000;
const WINDOW_HOURS = 18;
const ETA_CHOICES = [20, 30, 45, 60, 90];
const timeFmt = new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Budapest", hour: "2-digit", minute: "2-digit" });

const COLUMNS: { id: string; title: string; statuses: OrderStatus[] }[] = [
  { id: "new", title: "Új", statuses: ["new"] },
  { id: "kitchen", title: "Készül", statuses: ["accepted"] },
  { id: "out", title: "Úton / Átvehető", statuses: ["on_the_way", "ready"] },
  { id: "done", title: "Lezárt ma", statuses: ["completed", "rejected"] },
];

/** Live order list: Firestore listener when available, otherwise polling the admin API. */
function useLiveOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await adminFetch<{ orders: Order[] }>(`/api/admin/orders?hours=${WINDOW_HOURS}`);
      setOrders(data.orders);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nem sikerült frissíteni.");
    }
  }, []);

  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    const app = getFirebaseApp();

    const startPolling = () => {
      void refresh();
      const id = window.setInterval(() => void refresh(), POLL_MS);
      stop = () => window.clearInterval(id);
    };

    if (!app) {
      startPolling();
    } else {
      void (async () => {
        const [{ getAuth, onAuthStateChanged }, fs] = await Promise.all([import("firebase/auth"), import("firebase/firestore")]);
        const unsubAuth = onAuthStateChanged(getAuth(app), (user) => {
          unsubAuth();
          if (cancelled) return;
          if (!user) return startPolling();
          const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();
          const q = fs.query(fs.collection(fs.getFirestore(app), "orders"), fs.where("createdAt", ">=", since), fs.orderBy("createdAt", "desc"));
          stop = fs.onSnapshot(
            q,
            (snap) => setOrders(snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id }))),
            () => startPolling(),
          );
        });
      })();
    }
    return () => {
      cancelled = true;
      stop();
    };
  }, [refresh]);

  return { orders, error, refresh, setOrders };
}

/** Short beep with the Web Audio API (browsers allow it only after a click). */
function beep(ctx: AudioContext) {
  const now = ctx.currentTime;
  for (const [i, freq] of [880, 1175, 880].entries()) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now + i * 0.25);
    g.gain.exponentialRampToValueAtTime(0.4, now + i * 0.25 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.25 + 0.22);
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.25);
    o.stop(now + i * 0.25 + 0.24);
  }
}

export function OrderBoard() {
  const { orders, error, refresh, setOrders } = useLiveOrders();
  const [soundOn, setSoundOn] = useState(false);
  const [mobileColumn, setMobileColumn] = useState("new");
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);

  // Ring when an order id appears that we haven't seen yet.
  useEffect(() => {
    if (!orders) return;
    const ids = new Set(orders.map((o) => o.id));
    if (seen.current && audio.current && soundOn) {
      const fresh = orders.some((o) => o.status === "new" && !seen.current!.has(o.id));
      if (fresh) beep(audio.current);
    }
    seen.current = ids;
  }, [orders, soundOn]);

  // Keep nagging every 30 s while something waits in "Új".
  useEffect(() => {
    if (!soundOn) return;
    const id = window.setInterval(() => {
      if (audio.current && orders?.some((o) => o.status === "new")) beep(audio.current);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [soundOn, orders]);

  const enableSound = () => {
    audio.current ??= new AudioContext();
    void audio.current.resume();
    beep(audio.current);
    setSoundOn(true);
  };

  const replace = (o: Order) => setOrders((list) => list?.map((x) => (x.id === o.id ? o : x)) ?? null);

  const grouped = useMemo(
    () => Object.fromEntries(COLUMNS.map((c) => [c.id, (orders ?? []).filter((o) => c.statuses.includes(o.status))])),
    [orders],
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Rendelések</h1>
        {!soundOn ? (
          <button onClick={enableSound} className="h-10 rounded-full bg-secondary px-4 text-sm font-bold text-white">
            🔔 Hang bekapcsolása
          </button>
        ) : (
          <button onClick={() => setSoundOn(false)} className="h-10 rounded-full bg-surface-2 px-4 text-sm font-bold text-green-400">
            🔔 Hang: BE
          </button>
        )}
        {error && <span className="text-sm text-red-300">{error}</span>}
      </div>

      {/* Column switcher on phones */}
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto lg:hidden">
        {COLUMNS.map((c) => (
          <button
            key={c.id}
            onClick={() => setMobileColumn(c.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${mobileColumn === c.id ? "bg-secondary text-white" : "bg-surface-2 text-white/70"}`}
          >
            {c.title} ({grouped[c.id]?.length ?? 0})
          </button>
        ))}
      </div>

      {orders === null ? (
        <p className="text-white/60">Betöltés…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((c) => (
            <section key={c.id} className={`${mobileColumn === c.id ? "block" : "hidden"} lg:block`}>
              <h2 className="mb-3 hidden text-sm font-bold tracking-wide text-text-custom-2 uppercase lg:block">
                {c.title} ({grouped[c.id].length})
              </h2>
              <div className="grid gap-3">
                {grouped[c.id].length === 0 && <p className="rounded-card border border-dashed border-white/10 p-6 text-center text-sm text-white/40">Nincs rendelés</p>}
                {grouped[c.id].map((o) => (
                  <OrderCard key={o.id} order={o} onChange={replace} onConflict={refresh} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onChange, onConflict }: { order: Order; onChange: (o: Order) => void; onConflict: () => void }) {
  const [eta, setEta] = useState(order.etaMinutes);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isNew = order.status === "new";
  const forward = nextStatuses(order.status, order.fulfillment).filter((s) => s !== "rejected")[0];
  const canReject = nextStatuses(order.status, order.fulfillment).includes("rejected");
  const closed = order.status === "completed" || order.status === "rejected";

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await adminFetch<Order>(`/api/admin/orders/${order.id}`, { method: "POST", body }));
      setRejecting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hiba");
      onConflict();
    } finally {
      setBusy(false);
    }
  };

  const forwardLabel: Partial<Record<OrderStatus, string>> = {
    accepted: `Elfogad · ${eta} perc`,
    on_the_way: "Futár elindult",
    ready: "Átvehető",
    completed: "Lezárás",
  };

  return (
    <article className={`rounded-card border bg-surface p-4 ${isNew ? "border-secondary shadow-[0_0_0_1px_var(--color-secondary)]" : "border-white/10"} ${closed ? "opacity-60" : ""}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{order.number}</p>
          <p className="text-xs text-text-custom-2">
            {timeFmt.format(new Date(order.createdAt))} · {order.fulfillment === "delivery" ? "Kiszállítás" : "Elvitel"} ·{" "}
            {order.paymentMethod === "cash" ? "Készpénz" : "Kártya"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold tabular-nums">{formatHuf(order.total)}</p>
          {!closed && <p className="text-xs text-tertiary">Kész: {timeFmt.format(new Date(order.etaAt))}</p>}
          {closed && <p className="text-xs">{STATUS_LABELS_ADMIN[order.status]}</p>}
        </div>
      </header>

      <div className="mt-3 text-sm">
        <p className="font-bold">{order.customer.name}</p>
        <a href={`tel:${order.customer.phone}`} className="text-tertiary underline-offset-2 hover:underline">
          {formatHungarianPhone(order.customer.phone)}
        </a>
        {order.address && (
          <p className="mt-1 text-white/80">
            {order.address.zip} {order.address.city}, {order.address.street}
            {order.address.floor && `, ${order.address.floor}. em.`}
            {order.address.door && ` ${order.address.door}. ajtó`}
            {order.address.bell && ` · csengő: ${order.address.bell}`}
          </p>
        )}
      </div>

      <ul className="mt-3 grid gap-1.5 border-t border-white/10 pt-3 text-sm">
        {order.items.map((i, idx) => (
          <li key={idx}>
            <span className="font-bold">{i.quantity} ×</span> {i.name}
            {i.modifiers.length > 0 && <span className="block text-text-custom-2">{describeModifiers(i).join(" · ")}</span>}
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-3 rounded-button bg-secondary/15 px-3 py-2 text-sm">📝 {order.note}</p>}
      {order.status === "rejected" && order.rejectReason && <p className="mt-3 text-sm text-red-300">Elutasítva: {order.rejectReason}</p>}

      {!closed && (
        <div className="mt-4 grid gap-2">
          {(isNew || order.status === "accepted") && (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Elkészítési idő">
              {ETA_CHOICES.map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={eta === m}
                  onClick={() => (isNew ? setEta(m) : (setEta(m), void act({ action: "eta", etaMinutes: m })))}
                  className={`h-9 rounded-full px-3 text-sm font-bold ${eta === m ? "bg-tertiary text-black" : "bg-surface-2 text-white/70"}`}
                >
                  {m}′
                </button>
              ))}
            </div>
          )}
          {forward && (
            <button
              disabled={busy}
              onClick={() => act({ action: "status", from: order.status, to: forward, ...(forward === "accepted" ? { etaMinutes: eta } : {}) })}
              className="h-12 rounded-button bg-secondary font-bold text-white disabled:opacity-50"
            >
              {forwardLabel[forward] ?? STATUS_LABELS_ADMIN[forward]}
            </button>
          )}
          {canReject &&
            (rejecting ? (
              <div className="grid gap-2">
                <input
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Indok (a vásárló látja)"
                  className="h-11 rounded-button border border-white/10 bg-primary px-3 text-sm outline-none focus:border-red-400"
                />
                <div className="flex gap-2">
                  <button
                    disabled={busy || reason.trim().length < 2}
                    onClick={() => act({ action: "status", from: order.status, to: "rejected", rejectReason: reason.trim() })}
                    className="h-10 flex-1 rounded-button bg-red-500/80 text-sm font-bold text-white disabled:opacity-40"
                  >
                    Elutasítás
                  </button>
                  <button onClick={() => setRejecting(false)} className="h-10 rounded-button px-3 text-sm text-white/60">
                    Mégse
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setRejecting(true)} className="h-10 rounded-button text-sm text-red-300 hover:bg-red-500/10">
                Elutasítás…
              </button>
            ))}
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <a href={`/admin/nyomtatas/${order.id}`} target="_blank" className="text-sm text-white/60 underline-offset-2 hover:text-white hover:underline">
          🖨 Konyhai cetli
        </a>
      </div>
      {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
    </article>
  );
}
