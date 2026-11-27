"use client";

import { useMemo, useState } from "react";
import { cart } from "@/lib/client/cart-store";
import { defaultSelections, formatHuf, priceLine, PricingError } from "@/lib/pricing";
import type { ModifierGroup, Product } from "@/lib/types";
import { Badges } from "./badges";
import { CheckIcon } from "./icons";
import { useMenu } from "./menu-context";
import { QuantityStepper, Sheet } from "./sheet";

export function ProductSheet({ product, onClose, onAdded }: { product: Product; onClose: () => void; onAdded: () => void }) {
  const { index } = useMenu();
  const [selections, setSelections] = useState(() => defaultSelections(product, index));
  const [quantity, setQuantity] = useState(1);
  const [attempted, setAttempted] = useState(false);
  const groups = product.modifierGroupIds.map((id) => index.groups.get(id)).filter((g): g is ModifierGroup => !!g);

  const result = useMemo(() => {
    try {
      return { line: priceLine({ productId: product.id, quantity, selections }, index) };
    } catch (e) {
      return { error: e instanceof PricingError ? e.message : "Hiba" };
    }
  }, [product.id, quantity, selections, index]);

  const toggle = (group: ModifierGroup, optionId: string) => {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      const has = current.includes(optionId);
      let next: string[];
      if (group.type === "single") next = has && group.min === 0 ? [] : [optionId];
      else if (has) next = current.filter((id) => id !== optionId);
      else if (current.length >= group.max) next = current;
      else next = [...current, optionId];
      return { ...prev, [group.id]: next };
    });
  };

  const add = () => {
    if (!("line" in result)) {
      setAttempted(true);
      return;
    }
    cart.add(product.id, selections, quantity);
    onAdded();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={product.name}
      footer={
        <div className="flex items-center gap-3">
          <QuantityStepper value={quantity} onChange={setQuantity} />
          <button
            onClick={add}
            disabled={!product.available}
            className="flex h-12 flex-1 items-center justify-between rounded-button bg-secondary px-5 font-bold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            <span>{product.available ? "Kosárba" : "Elfogyott"}</span>
            <span className="tabular-nums">{"line" in result && result.line ? formatHuf(result.line.lineTotal) : ""}</span>
          </button>
        </div>
      }
    >
      {product.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt="" className="mb-4 aspect-[16/9] w-full rounded-card object-cover" />
      )}
      {product.description && <p className="text-white/70">{product.description}</p>}
      <div className="mt-3 flex items-center gap-3">
        <span className="text-lg font-bold">{formatHuf(product.price)}</span>
        <Badges badges={product.badges} />
      </div>

      {groups.map((group) => {
        const chosen = selections[group.id] ?? [];
        const required = group.type !== "remove" && group.min > 0;
        const hint =
          group.type === "remove"
            ? "Vedd ki, amit nem kérsz"
            : group.type === "single"
              ? required
                ? "Kötelező, válassz egyet"
                : "Opcionális"
              : group.freeCount > 0
                ? `${group.freeCount} az árban, a többi feláras`
                : `Legfeljebb ${group.max}`;
        return (
          <fieldset key={group.id} className="mt-6">
            <legend className="flex w-full items-baseline justify-between gap-2">
              <span className="font-bold">{group.name}</span>
              <span className={`text-xs ${required && chosen.length < group.min ? "text-tertiary" : "text-text-custom-2"}`}>{hint}</span>
            </legend>
            <div className="mt-2 grid gap-2">
              {group.options.map((o) => {
                const isRemove = group.type === "remove";
                const selected = isRemove ? !chosen.includes(o.id) : chosen.includes(o.id);
                const disabled = !o.available && !isRemove;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={group.type === "single" ? "radio" : "checkbox"}
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => toggle(group, o.id)}
                    className={`flex min-h-12 items-center gap-3 rounded-button border px-4 py-2 text-left transition ${
                      selected ? "border-secondary bg-secondary/15" : "border-white/10 bg-surface-2 hover:border-white/25"
                    } disabled:opacity-40`}
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center border ${group.type === "single" ? "rounded-full" : "rounded-md"} ${
                        selected ? "border-secondary bg-secondary text-white" : "border-white/30"
                      }`}
                    >
                      {selected && <CheckIcon width={14} height={14} strokeWidth={3} />}
                    </span>
                    <span className="flex-1">
                      <span className={isRemove && !selected ? "text-white/50 line-through" : ""}>{o.name}</span>
                      {o.description && <span className="block text-xs text-text-custom-2">{o.description}</span>}
                      {disabled && <span className="block text-xs text-red-400">Elfogyott</span>}
                    </span>
                    {o.priceDelta > 0 && !isRemove && (
                      <span className="text-sm text-tertiary tabular-nums">
                        {group.freeCount > 0 ? "" : "+"}
                        {formatHuf(o.priceDelta)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {attempted && "error" in result && result.error && (
        <p className="mt-5 rounded-button bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {result.error}
        </p>
      )}
    </Sheet>
  );
}
