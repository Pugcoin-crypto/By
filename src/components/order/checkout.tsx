"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { cart, rememberOrder, useCart } from "@/lib/client/cart-store";
import { normalizeHungarianPhone } from "@/lib/phone";
import { describeModifiers, formatHuf } from "@/lib/pricing";
import type { Fulfillment, PaymentMethod } from "@/lib/types";
import { ArrowLeftIcon, BagIcon, BikeIcon } from "./icons";
import { useMenu, usePricedCart } from "./menu-context";

type FieldErrors = Partial<Record<"name" | "phone" | "city" | "street", string>>;

export function Checkout() {
  const { menu } = useMenu();
  const router = useRouter();
  const lines = useCart();
  const { rows, subtotal, hasErrors } = usePricedCart(lines);

  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zoneId, setZoneId] = useState(menu.zones[0]?.id ?? "");
  const [street, setStreet] = useState("");
  const [floor, setFloor] = useState("");
  const [door, setDoor] = useState("");
  const [bell, setBell] = useState("");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearError = (field: keyof FieldErrors) => setErrors((x) => (x[field] ? { ...x, [field]: undefined } : x));

  const zone = menu.zones.find((z) => z.id === zoneId);
  const deliveryFee = fulfillment === "delivery" ? (zone?.fee ?? 0) : 0;
  const total = subtotal + deliveryFee;
  const minOrder = Math.max(menu.store.minOrderValue, fulfillment === "delivery" ? (zone?.minOrderValue ?? 0) : 0);
  const belowMin = minOrder > 0 && subtotal < minOrder;
  const state = menu.store.state;

  if (rows.length === 0 && !submitting) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <p className="text-xl font-bold">A kosarad üres</p>
        <Link href="/rendeles" className="mt-6 inline-flex h-12 items-center rounded-button bg-secondary px-6 font-bold text-white">
          Vissza az étlaphoz
        </Link>
      </main>
    );
  }

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (name.trim().length < 2) e.name = "Add meg a neved.";
    if (!normalizeHungarianPhone(phone)) e.phone = "Adj meg egy érvényes magyar telefonszámot, pl. +36 30 123 4567.";
    if (fulfillment === "delivery") {
      if (!zone) e.city = "Válassz települést.";
      if (street.trim().length < 3) e.street = "Add meg az utcát és a házszámot.";
    }
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector<HTMLElement>(`[name="${Object.keys(e)[0]}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fulfillment,
          customer: { name: name.trim(), phone },
          ...(fulfillment === "delivery" && zone
            ? {
                address: {
                  zip: zone.postcodes[0],
                  city: zone.city,
                  street: street.trim(),
                  ...(floor.trim() ? { floor: floor.trim() } : {}),
                  ...(door.trim() ? { door: door.trim() } : {}),
                  ...(bell.trim() ? { bell: bell.trim() } : {}),
                },
              }
            : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          paymentMethod: payment,
          items: lines.map(({ productId, quantity, selections }) => ({ productId, quantity, selections })),
          ...(website ? { website } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; trackingToken?: string; number?: string };
      if (!res.ok || !data.trackingToken) {
        setFormError(data.error ?? "Nem sikerült leadni a rendelést. Próbáld újra, vagy hívj minket telefonon.");
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      rememberOrder(data.trackingToken, data.number ?? "");
      router.replace(`/rendeles/kovetes/${data.trackingToken}`);
      cart.clear();
    } catch {
      setFormError("Nincs internetkapcsolat, vagy a szerver nem válaszol. Próbáld újra!");
      setSubmitting(false);
    }
  };

  const payLabel = fulfillment === "delivery" ? "a futárnál" : "átvételkor";

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-6 pb-16">
      <Link href="/rendeles" className="inline-flex items-center gap-2 text-sm text-text-custom-2 hover:text-white">
        <ArrowLeftIcon width={16} height={16} /> Vissza az étlaphoz
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Pénztár</h1>

      {formError && (
        <p className="mt-4 rounded-card bg-red-500/10 px-4 py-3 text-red-300" role="alert">
          {formError}
        </p>
      )}
      {!state.open && (
        <p className="mt-4 rounded-card border border-secondary/50 bg-secondary/10 px-4 py-3 text-tertiary" role="status">
          {state.message}
        </p>
      )}

      <form onSubmit={submit} noValidate className="mt-6 grid gap-8">
        {/* Fulfillment */}
        <div role="radiogroup" aria-label="Átvételi mód" className="grid grid-cols-2 gap-1 rounded-card bg-surface p-1">
          {(
            [
              ["delivery", "Kiszállítás", BikeIcon],
              ["pickup", "Elvitel", BagIcon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={fulfillment === value}
              onClick={() => setFulfillment(value)}
              className={`flex h-12 items-center justify-center gap-2 rounded-button font-bold transition ${
                fulfillment === value ? "bg-secondary text-white" : "text-white/60 hover:text-white"
              }`}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>

        <Section title="Adataid">
          <Field label="Név" error={errors.name}>
            <input name="name" autoComplete="name" value={name} onChange={(e) => (setName(e.target.value), clearError("name"))} className={input(errors.name)} />
          </Field>
          <Field label="Telefonszám" error={errors.phone} hint="A futár vagy az étterem ezen a számon keres.">
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+36 30 123 4567"
              value={phone}
              onChange={(e) => (setPhone(e.target.value), clearError("phone"))}
              onBlur={() => phone && setErrors((x) => ({ ...x, phone: normalizeHungarianPhone(phone) ? undefined : "Adj meg egy érvényes magyar telefonszámot, pl. +36 30 123 4567." }))}
              className={input(errors.phone)}
            />
          </Field>
        </Section>

        {fulfillment === "delivery" ? (
          <Section title="Szállítási cím">
            <Field label="Település" error={errors.city}>
              <select name="city" value={zoneId} onChange={(e) => (setZoneId(e.target.value), clearError("city"))} className={input(errors.city)}>
                {menu.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.postcodes[0]} {z.city} — {z.fee === 0 ? "ingyenes szállítás" : `${formatHuf(z.fee)} szállítás`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Utca, házszám" error={errors.street}>
              <input name="street" autoComplete="address-line1" value={street} onChange={(e) => (setStreet(e.target.value), clearError("street"))} className={input(errors.street)} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Emelet">
                <input value={floor} onChange={(e) => setFloor(e.target.value)} className={input()} />
              </Field>
              <Field label="Ajtó">
                <input value={door} onChange={(e) => setDoor(e.target.value)} className={input()} />
              </Field>
              <Field label="Kapucsengő">
                <input value={bell} onChange={(e) => setBell(e.target.value)} className={input()} />
              </Field>
            </div>
          </Section>
        ) : (
          <Section title="Átvétel">
            <p className="text-white/70">
              Személyesen az étteremben, Monoron. Szólunk, amikor átvehető; a várható időt a követő oldalon látod.
            </p>
          </Section>
        )}

        <Section title="Megjegyzés">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={fulfillment === "delivery" ? "Pl. a futárnak: hátsó kapu; a konyhának: extra csípősen" : "Pl. a konyhának: extra csípősen"}
            className={`${input()} h-auto py-3`}
          />
        </Section>

        <Section title="Fizetés">
          <div role="radiogroup" aria-label="Fizetési mód" className="grid gap-2">
            {(
              [
                ["cash", `Készpénz ${payLabel}`],
                ["card_on_delivery", `Bankkártya ${payLabel}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={payment === value}
                onClick={() => setPayment(value)}
                className={`flex min-h-12 items-center gap-3 rounded-button border px-4 text-left transition ${
                  payment === value ? "border-secondary bg-secondary/15" : "border-white/10 bg-surface-2"
                }`}
              >
                <span className={`size-5 rounded-full border-2 ${payment === value ? "border-secondary bg-secondary shadow-[inset_0_0_0_3px_#121212]" : "border-white/30"}`} />
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-custom-2">Online fizetés hamarosan.</p>
        </Section>

        {/* Honeypot, hidden from people */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          aria-hidden
        />

        <Section title="Összesítő">
          <ul className="divide-y divide-white/10">
            {rows.map(({ line, priced, error }) => (
              <li key={line.key} className="flex justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-bold">
                    {line.quantity} × {priced?.name ?? "Ismeretlen termék"}
                  </p>
                  {priced && <p className="text-sm text-text-custom-2">{describeModifiers(priced).join(" · ")}</p>}
                  {error && <p className="text-sm text-red-300">{error}</p>}
                </div>
                <span className="shrink-0 tabular-nums">{priced ? formatHuf(priced.lineTotal) : ""}</span>
              </li>
            ))}
          </ul>
          <dl className="grid gap-1 border-t border-white/10 pt-3">
            <Row label="Részösszeg" value={formatHuf(subtotal)} />
            {fulfillment === "delivery" && <Row label={`Szállítás (${zone?.city ?? "—"})`} value={deliveryFee === 0 ? "Ingyenes" : formatHuf(deliveryFee)} />}
            <div className="mt-2 flex justify-between text-xl font-bold">
              <dt>Fizetendő</dt>
              <dd className="tabular-nums">{formatHuf(total)}</dd>
            </div>
          </dl>
        </Section>

        {belowMin && <p className="text-tertiary">A minimális rendelési érték {formatHuf(minOrder)}.</p>}
        {hasErrors && (
          <p className="text-red-300">
            A kosárban van már nem rendelhető tétel. <Link href="/rendeles" className="underline">Vissza az étlaphoz</Link>
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || hasErrors || belowMin || !state.open}
          className="sticky bottom-4 flex h-14 items-center justify-between rounded-card bg-secondary px-5 text-lg font-bold text-white shadow-lg shadow-black/60 transition hover:brightness-110 disabled:opacity-50"
        >
          <span>{submitting ? "Rendelés küldése…" : "Rendelés leadása"}</span>
          <span className="tabular-nums">{formatHuf(total)}</span>
        </button>
      </form>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-white/80">{label}</span>
      {children}
      {error ? <span className="text-sm text-red-300">{error}</span> : hint && <span className="text-xs text-text-custom-2">{hint}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-white/80">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

const input = (error?: string) =>
  `h-12 w-full rounded-card border bg-surface px-4 text-base text-white outline-none placeholder:text-white/30 focus:border-secondary ${
    error ? "border-red-400" : "border-white/10"
  }`;
