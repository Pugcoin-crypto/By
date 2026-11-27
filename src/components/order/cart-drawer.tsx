"use client";

import Link from "next/link";
import { cart, useCart } from "@/lib/client/cart-store";
import { describeModifiers, formatHuf } from "@/lib/pricing";
import { TrashIcon } from "./icons";
import { useMenu, usePricedCart } from "./menu-context";
import { QuantityStepper, Sheet } from "./sheet";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { menu } = useMenu();
  const lines = useCart();
  const { rows, subtotal, hasErrors } = usePricedCart(lines);
  const min = menu.store.minOrderValue;
  const belowMin = min > 0 && subtotal < min;
  const closed = !menu.store.state.open;
  const canCheckout = rows.length > 0 && !hasErrors && !belowMin && !closed;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Kosár"
      side
      footer={
        rows.length > 0 && (
          <div className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <span className="text-white/70">Részösszeg</span>
              <span className="text-xl font-bold tabular-nums">{formatHuf(subtotal)}</span>
            </div>
            <p className="text-xs text-text-custom-2">A szállítási díjat a pénztárban, a cím alapján számoljuk.</p>
            {belowMin && <p className="text-sm text-tertiary">A minimális rendelési érték {formatHuf(min)}. Még {formatHuf(min - subtotal)} hiányzik.</p>}
            {hasErrors && <p className="text-sm text-red-300">Néhány tétel már nem rendelhető. Töröld őket a folytatáshoz.</p>}
            {closed && menu.store.state.open === false && <p className="text-sm text-tertiary">{menu.store.state.message}</p>}
            {canCheckout ? (
              <Link
                href="/rendeles/penztar"
                onClick={onClose}
                className="flex h-12 items-center justify-center rounded-button bg-secondary font-bold text-white transition hover:brightness-110"
              >
                Tovább a pénztárhoz
              </Link>
            ) : (
              <span className="flex h-12 items-center justify-center rounded-button bg-secondary/40 font-bold text-white/60">
                Tovább a pénztárhoz
              </span>
            )}
          </div>
        )
      }
    >
      {rows.length === 0 ? (
        <div className="py-16 text-center text-white/60">
          <p className="text-lg font-bold text-white">A kosarad üres</p>
          <p className="mt-2">Válassz valamit az étlapról!</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/10">
          {rows.map(({ line, priced, error }) => {
            const product = menu.products.find((p) => p.id === line.productId);
            return (
              <li key={line.key} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{priced?.name ?? product?.name ?? "Ismeretlen termék"}</p>
                    {priced && (
                      <p className="mt-1 text-sm text-text-custom-2">{describeModifiers(priced).join(" · ")}</p>
                    )}
                    {error && <p className="mt-1 text-sm text-red-300">{error}</p>}
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">{priced ? formatHuf(priced.lineTotal) : ""}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {priced ? (
                    <QuantityStepper size="sm" value={line.quantity} min={0} onChange={(q) => cart.setQuantity(line.key, q)} />
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => cart.remove(line.key)}
                    className="flex min-h-10 items-center gap-1.5 rounded-button px-3 text-sm text-white/60 hover:text-white"
                  >
                    <TrashIcon width={16} height={16} /> Törlés
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
