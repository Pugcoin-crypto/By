// Single source of truth for cart prices. The browser uses it to show totals;
// the server runs the same code on fresh database data and only trusts that result.

import type {
  CartLineInput,
  Catalog,
  ModifierGroup,
  PricedLine,
  PricedModifier,
  Product,
} from "./types";

export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_LINES = 40;

export class PricingError extends Error {
  constructor(
    message: string,
    readonly code:
      | "empty_cart"
      | "too_many_lines"
      | "unknown_product"
      | "product_unavailable"
      | "bad_quantity"
      | "unknown_group"
      | "unknown_option"
      | "option_unavailable"
      | "selection_count",
    readonly productId?: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

export interface CatalogIndex {
  products: Map<string, Product>;
  groups: Map<string, ModifierGroup>;
}

export function indexCatalog(catalog: Catalog): CatalogIndex {
  return {
    products: new Map(catalog.products.map((p) => [p.id, p])),
    groups: new Map(catalog.modifierGroups.map((g) => [g.id, g])),
  };
}

/** Prices one cart line, validating every choice against the catalog. */
export function priceLine(line: CartLineInput, index: CatalogIndex): PricedLine {
  const product = index.products.get(line.productId);
  if (!product) throw new PricingError("Ez a termék már nem szerepel az étlapon.", "unknown_product", line.productId);
  if (!product.available) throw new PricingError(`${product.name} jelenleg nem elérhető.`, "product_unavailable", product.id);
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY_PER_LINE) {
    throw new PricingError(`Érvénytelen mennyiség: ${product.name}.`, "bad_quantity", product.id);
  }

  const selections = line.selections ?? {};
  for (const groupId of Object.keys(selections)) {
    if (!product.modifierGroupIds.includes(groupId)) {
      throw new PricingError(`Érvénytelen opció: ${product.name}.`, "unknown_group", product.id);
    }
  }

  const modifiers: PricedModifier[] = [];
  let extras = 0;

  for (const groupId of product.modifierGroupIds) {
    const group = index.groups.get(groupId);
    if (!group) throw new PricingError(`Hiányzó opciócsoport: ${groupId}.`, "unknown_group", product.id);

    const chosenIds = [...new Set(selections[groupId] ?? [])];
    const count = chosenIds.length;
    const min = group.type === "remove" ? 0 : group.min;
    if (count < min || count > group.max) {
      throw new PricingError(
        group.min === group.max
          ? `${product.name}: válassz ${group.min} lehetőséget ebből: ${group.name}.`
          : `${product.name}: ${group.name} – ${group.min}–${group.max} választható.`,
        "selection_count",
        product.id,
      );
    }

    const chosen = chosenIds.map((id) => {
      const option = group.options.find((o) => o.id === id);
      if (!option) throw new PricingError(`${product.name}: ismeretlen opció.`, "unknown_option", product.id);
      // Leaving out an ingredient is always allowed, even if it ran out.
      if (!option.available && group.type !== "remove") {
        throw new PricingError(`${product.name}: ${option.name} jelenleg nem elérhető.`, "option_unavailable", product.id);
      }
      return option;
    });

    if (group.type === "remove") {
      for (const o of chosen) {
        modifiers.push({ groupId, groupName: group.name, optionId: o.id, name: `${o.name} nélkül`, priceDelta: 0, removed: true });
      }
      continue;
    }

    // The cheapest `freeCount` choices are free.
    const freeIds = new Set(
      [...chosen].sort((a, b) => a.priceDelta - b.priceDelta).slice(0, group.freeCount).map((o) => o.id),
    );
    for (const o of chosen) {
      const priceDelta = freeIds.has(o.id) ? 0 : o.priceDelta;
      extras += priceDelta;
      modifiers.push({ groupId, groupName: group.name, optionId: o.id, name: o.name, priceDelta, removed: false });
    }
  }

  const unitPrice = product.price + extras;
  return {
    productId: product.id,
    name: product.name,
    quantity: line.quantity,
    basePrice: product.price,
    modifiers,
    unitPrice,
    lineTotal: unitPrice * line.quantity,
  };
}

export function priceCart(lines: CartLineInput[], index: CatalogIndex): { items: PricedLine[]; subtotal: number } {
  if (lines.length === 0) throw new PricingError("A kosár üres.", "empty_cart");
  if (lines.length > MAX_LINES) throw new PricingError("Túl sok tétel egy rendelésben.", "too_many_lines");
  const items = lines.map((l) => priceLine(l, index));
  return { items, subtotal: items.reduce((sum, i) => sum + i.lineTotal, 0) };
}

/** Selections a fresh customisation sheet starts with. */
export function defaultSelections(product: Product, index: CatalogIndex): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const groupId of product.modifierGroupIds) {
    const g = index.groups.get(groupId);
    if (!g) continue;
    if (g.type === "single" && g.defaultOptionId) out[groupId] = [g.defaultOptionId];
    else out[groupId] = [];
  }
  return out;
}

/** Human-readable details for receipts and the tracking page. */
export function describeModifiers(line: Pick<PricedLine, "modifiers">): string[] {
  return line.modifiers.map((m) => (m.priceDelta > 0 ? `${m.name} (+${formatHuf(m.priceDelta)})` : m.name));
}

export function formatHuf(value: number): string {
  // Hungarian style: "3 380 Ft" with a narrow no-break space as thousands separator.
  return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} Ft`;
}
