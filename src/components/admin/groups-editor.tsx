"use client";

import { useState } from "react";
import { slug } from "@/lib/slug";
import type { ModifierGroup, Product } from "@/lib/types";
import { adminFetch } from "./api";
import { Switch } from "./switch";

const TYPE_LABEL: Record<ModifierGroup["type"], string> = {
  single: "Egy választható",
  multi: "Több választható",
  remove: "Kivehető összetevők",
};

export function GroupsEditor({ groups, products }: { groups: ModifierGroup[]; products: Product[] }) {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold">Opciók és felárak</h1>
      <p className="mt-1 text-sm text-text-custom-2">
        Itt módosíthatod a feláras opciókat (pl. borjúhús, extra szószok) és jelölheted, ha valamelyik elfogyott. Hogy melyik termékhez
        melyik csoport tartozik, azt a termék szerkesztésénél állíthatod.
      </p>
      <div className="mt-6 grid gap-6">
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} usedBy={products.filter((p) => p.modifierGroupIds.includes(g.id)).length} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group, usedBy }: { group: ModifierGroup; usedBy: number }) {
  const [g, setG] = useState(group);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const update = (next: ModifierGroup) => {
    setG(next);
    setDirty(true);
    setStatus(null);
  };
  const setOption = (i: number, patch: Partial<ModifierGroup["options"][number]>) =>
    update({ ...g, options: g.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) });

  const save = async () => {
    try {
      await adminFetch(`/api/admin/modifier-groups/${g.id}`, { method: "PUT", body: g });
      setDirty(false);
      setStatus("Mentve");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Hiba");
    }
  };

  return (
    <section className="rounded-card bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={g.name} onChange={(e) => update({ ...g, name: e.target.value })} className="h-10 rounded-button bg-surface-2 px-3 font-bold" aria-label="Csoport neve" />
        <span className="text-sm text-text-custom-2">
          {TYPE_LABEL[g.type]} · {usedBy} termék
          {g.freeCount > 0 && ` · ${g.freeCount} az árban`}
        </span>
      </div>
      <ul className="mt-3 divide-y divide-white/10">
        {g.options.map((o, i) => (
          <li key={i} className="flex flex-wrap items-center gap-3 py-2">
            <input value={o.name} onChange={(e) => setOption(i, { name: e.target.value })} className="h-10 min-w-40 flex-1 rounded-button bg-surface-2 px-3" aria-label="Opció neve" />
            {g.type !== "remove" && (
              <label className="flex items-center gap-2 text-sm">
                +
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={o.priceDelta}
                  onChange={(e) => setOption(i, { priceDelta: Math.max(0, Math.round(Number(e.target.value))) })}
                  className="h-10 w-24 rounded-button bg-surface-2 px-3 text-right tabular-nums"
                  aria-label="Felár"
                />
                Ft
              </label>
            )}
            <Switch checked={o.available} onChange={(v) => setOption(i, { available: v })} label={o.available ? "Van" : "Elfogyott"} />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            const name = window.prompt("Új opció neve:");
            if (!name) return;
            let id = slug(name) || `opcio-${g.options.length + 1}`;
            while (g.options.some((o) => o.id === id)) id += "-2";
            update({ ...g, options: [...g.options, { id, name, priceDelta: 0, available: true }], max: g.type === "single" ? g.max : Math.max(g.max, g.options.length + 1) });
          }}
          className="h-10 rounded-button bg-surface-2 px-3 text-sm"
        >
          + Opció
        </button>
        <button onClick={save} disabled={!dirty} className="h-10 rounded-button bg-secondary px-4 text-sm font-bold text-white disabled:opacity-40">
          Mentés
        </button>
        {status && <span className={`text-sm ${status === "Mentve" ? "text-green-400" : "text-red-300"}`}>{status}</span>}
      </div>
    </section>
  );
}
