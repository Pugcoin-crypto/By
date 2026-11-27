"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { indexCatalog, priceLine, PricingError, type CatalogIndex } from "@/lib/pricing";
import type { PricedLine, PublicMenu } from "@/lib/types";
import type { CartLine } from "@/lib/client/cart-store";

interface MenuContextValue {
  menu: PublicMenu;
  index: CatalogIndex;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ menu, children }: { menu: PublicMenu; children: ReactNode }) {
  const value = useMemo(
    () => ({ menu, index: indexCatalog({ categories: menu.categories, products: menu.products, modifierGroups: menu.modifierGroups }) }),
    [menu],
  );
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuContextValue {
  const v = useContext(MenuContext);
  if (!v) throw new Error("useMenu outside MenuProvider");
  return v;
}

export type CartRow = { line: CartLine; priced: PricedLine; error?: undefined } | { line: CartLine; priced?: undefined; error: string };

/** Prices every cart line against the current menu; broken lines carry an error instead. */
export function usePricedCart(lines: CartLine[]) {
  const { index } = useMenu();
  return useMemo(() => {
    const rows: CartRow[] = lines.map((line) => {
      try {
        return { line, priced: priceLine(line, index) };
      } catch (e) {
        return { line, error: e instanceof PricingError ? e.message : "Ez a tétel nem rendelhető." };
      }
    });
    const subtotal = rows.reduce((s, r) => s + (r.priced?.lineTotal ?? 0), 0);
    const count = rows.reduce((s, r) => s + r.line.quantity, 0);
    return { rows, subtotal, count, hasErrors: rows.some((r) => r.error) };
  }, [lines, index]);
}
