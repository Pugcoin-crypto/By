"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatHuf } from "@/lib/pricing";
import type { Catalog, Category, Product } from "@/lib/types";
import { useStaff } from "./admin-shell";
import { adminFetch } from "./api";
import { Switch } from "./switch";

export function MenuManager({ catalog }: { catalog: Catalog }) {
  const staff = useStaff();
  const isAdmin = staff.role === "admin";
  const [products, setProducts] = useState(catalog.products);
  const [error, setError] = useState<string | null>(null);

  const setAvailable = async (p: Product, available: boolean) => {
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, available } : x)));
    try {
      await adminFetch(`/api/admin/products/${p.id}`, { method: "PATCH", body: { available } });
    } catch (e) {
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, available: !available } : x)));
      setError(e instanceof Error ? e.message : "Hiba");
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Étlap</h1>
        {isAdmin && (
          <Link href="/admin/etlap/uj" className="ml-auto flex h-10 items-center rounded-button bg-secondary px-4 text-sm font-bold text-white">
            + Új termék
          </Link>
        )}
      </div>
      <p className="mt-1 text-sm text-text-custom-2">Az „Elérhető” kapcsolóval azonnal elrejtheted az elfogyott tételeket a rendelőfelületen.</p>
      {error && <p className="mt-3 text-red-300">{error}</p>}

      {catalog.categories.map((c) => (
        <section key={c.id} className="mt-8">
          <CategoryHeader category={c} editable={isAdmin} />
          <ul className="mt-3 divide-y divide-white/10 rounded-card bg-surface">
            {products
              .filter((p) => p.categoryId === c.id)
              .map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold ${p.available ? "" : "text-white/40 line-through"}`}>{p.name}</p>
                    <p className="text-sm text-text-custom-2 tabular-nums">{formatHuf(p.price)}</p>
                  </div>
                  <Switch checked={p.available} onChange={(v) => setAvailable(p, v)} label={p.available ? "Elérhető" : "Elfogyott"} />
                  {isAdmin && (
                    <Link href={`/admin/etlap/${p.id}`} className="h-10 rounded-button bg-surface-2 px-3 text-sm leading-10">
                      Szerkesztés
                    </Link>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CategoryHeader({ category, editable }: { category: Category; editable: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    try {
      await adminFetch(`/api/admin/categories/${category.id}`, { method: "PUT", body: draft });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hiba");
    }
  };

  if (!editing) {
    return (
      <div className="flex items-baseline gap-3">
        <h2 className={`text-xl font-bold ${category.active ? "" : "text-white/40"}`}>
          {category.name} {!category.active && <span className="text-sm font-normal">(rejtett)</span>}
        </h2>
        {editable && (
          <button onClick={() => setEditing(true)} className="text-sm text-white/60 hover:text-white">
            szerkesztés
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="grid gap-2 rounded-card bg-surface-2 p-3 sm:grid-cols-[1fr_2fr_auto_auto_auto] sm:items-center">
      <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-10 rounded-button bg-primary px-3" aria-label="Név" />
      <input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="h-10 rounded-button bg-primary px-3" placeholder="Leírás" aria-label="Leírás" />
      <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className="h-10 w-20 rounded-button bg-primary px-3" aria-label="Sorrend" />
      <Switch checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Látható" />
      <div className="flex gap-2">
        <button onClick={save} className="h-10 rounded-button bg-secondary px-3 text-sm font-bold">Mentés</button>
        <button onClick={() => (setEditing(false), setDraft(category))} className="h-10 px-2 text-sm text-white/60">Mégse</button>
      </div>
      {error && <p className="text-sm text-red-300 sm:col-span-5">{error}</p>}
    </div>
  );
}
