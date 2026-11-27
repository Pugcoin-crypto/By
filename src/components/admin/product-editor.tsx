"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { slug } from "@/lib/slug";
import type { Badge, Catalog, Product } from "@/lib/types";
import { adminFetch } from "./api";
import { Switch } from "./switch";

const BADGES: { id: Badge; label: string }[] = [
  { id: "nepszeru", label: "Népszerű" },
  { id: "vega", label: "Vega" },
  { id: "csipos", label: "Csípős" },
];

export function ProductEditor({ catalog, product }: { catalog: Catalog; product: Product | null }) {
  const router = useRouter();
  const isNew = !product;
  const [p, setP] = useState<Product>(
    product ?? {
      id: "",
      categoryId: catalog.categories[0]?.id ?? "",
      name: "",
      description: "",
      price: 0,
      imageUrl: "",
      badges: [],
      available: true,
      sortOrder: (catalog.products.at(-1)?.sortOrder ?? 0) + 1,
      modifierGroupIds: [],
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy(true);
    setError(null);
    const body = { ...p, id: isNew ? slug(p.id || p.name) : p.id, description: p.description || undefined, imageUrl: p.imageUrl || "" };
    try {
      await adminFetch(isNew ? "/api/admin/products" : `/api/admin/products/${p.id}`, { method: isNew ? "POST" : "PUT", body });
      router.push("/admin/etlap");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hiba");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!product || !window.confirm(`Biztosan törlöd: ${product.name}? Ez nem vonható vissza.`)) return;
    try {
      await adminFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      router.push("/admin/etlap");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hiba");
    }
  };

  const toggleGroup = (id: string) =>
    set("modifierGroupIds", p.modifierGroupIds.includes(id) ? p.modifierGroupIds.filter((g) => g !== id) : [...p.modifierGroupIds, id]);

  const input = "h-12 w-full rounded-card border border-white/10 bg-surface px-4 outline-none focus:border-secondary";

  return (
    <div className="mx-auto max-w-2xl p-4">
      <Link href="/admin/etlap" className="text-sm text-text-custom-2 hover:text-white">
        ← Étlap
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{isNew ? "Új termék" : p.name}</h1>

      <div className="mt-6 grid gap-5">
        <F label="Név">
          <input className={input} value={p.name} onChange={(e) => set("name", e.target.value)} />
        </F>
        {isNew && (
          <F label="Azonosító (URL-ben, később nem módosítható)">
            <input className={input} value={p.id} placeholder={slug(p.name)} onChange={(e) => set("id", e.target.value)} />
          </F>
        )}
        <F label="Leírás">
          <textarea className={`${input} h-24 py-3`} value={p.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Ár (Ft)">
            <input className={input} type="number" min={0} step={10} value={p.price} onChange={(e) => set("price", Math.round(Number(e.target.value)))} />
          </F>
          <F label="Sorrend">
            <input className={input} type="number" min={0} value={p.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
          </F>
        </div>
        <F label="Kategória">
          <select className={input} value={p.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            {catalog.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </F>
        <F label="Kép URL (nem kötelező)">
          <input className={input} type="url" placeholder="https://…" value={p.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} />
        </F>
        <F label="Címkék">
          <div className="flex flex-wrap gap-2">
            {BADGES.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={p.badges.includes(b.id)}
                onClick={() => set("badges", p.badges.includes(b.id) ? p.badges.filter((x) => x !== b.id) : [...p.badges, b.id])}
                className={`h-10 rounded-full px-4 text-sm font-bold ${p.badges.includes(b.id) ? "bg-secondary text-white" : "bg-surface-2 text-white/60"}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </F>
        <F label="Opciócsoportok (a kijelölés sorrendjében jelennek meg)">
          <div className="grid gap-2">
            {catalog.modifierGroups.map((g) => {
              const pos = p.modifierGroupIds.indexOf(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={pos >= 0}
                  onClick={() => toggleGroup(g.id)}
                  className={`flex min-h-11 items-center gap-3 rounded-button border px-3 text-left text-sm ${pos >= 0 ? "border-secondary bg-secondary/15" : "border-white/10 bg-surface"}`}
                >
                  <span className="grid size-6 place-items-center rounded-full bg-black/30 text-xs font-bold">{pos >= 0 ? pos + 1 : ""}</span>
                  <span className="flex-1">
                    {g.name} <span className="text-text-custom-2">· {g.id}</span>
                  </span>
                  <span className="text-xs text-text-custom-2">{g.options.map((o) => o.name).slice(0, 3).join(", ")}…</span>
                </button>
              );
            })}
          </div>
        </F>
        <Switch checked={p.available} onChange={(v) => set("available", v)} label={p.available ? "Elérhető" : "Elfogyott"} />

        {error && <p className="text-red-300" role="alert">{error}</p>}
        <div className="flex gap-3">
          <button onClick={save} disabled={busy} className="h-12 flex-1 rounded-button bg-secondary font-bold text-white disabled:opacity-50">
            {busy ? "Mentés…" : "Mentés"}
          </button>
          {!isNew && (
            <button onClick={remove} className="h-12 rounded-button px-4 text-red-300 hover:bg-red-500/10">
              Törlés
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm text-white/80">{label}</span>
      {children}
    </label>
  );
}
