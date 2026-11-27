import { describe, expect, it } from "vitest";
import { seedCatalog } from "./menu-seed";
import { defaultSelections, formatHuf, indexCatalog, priceCart, priceLine, PricingError } from "./pricing";
import type { CartLineInput } from "./types";

const index = indexCatalog(seedCatalog);
const line = (productId: string, selections: Record<string, string[]> = {}, quantity = 1): CartLineInput => ({
  productId,
  quantity,
  selections,
});

describe("priceLine", () => {
  it("prices a chicken dürüm at the menu price", () => {
    const l = priceLine(line("sima-durum", { hus: ["csirke"] }), index);
    expect(l.unitPrice).toBe(2480);
    expect(l.lineTotal).toBe(2480);
  });

  it("adds 500 Ft for beef", () => {
    expect(priceLine(line("istanbul-tal", { hus: ["borju"], koret: ["rizs"] }), index).unitPrice).toBe(4180 + 500);
  });

  it("Antalya dürüm is 2 880 Ft", () => {
    expect(priceLine(line("antalya-durum", { hus: ["csirke"] }), index).unitPrice).toBe(2880);
  });

  it("adds extra sauces (+380, cheddar +480) and extra meat (+990 / +1200)", () => {
    const l = priceLine(
      line("feta-pita", {
        hus: ["csirke"],
        extraszosz: ["andalouse", "cheddar"],
        extrahus: ["extra-csirke", "extra-borju"],
      }),
      index,
    );
    expect(l.unitPrice).toBe(2780 + 380 + 480 + 990 + 1200);
  });

  it("removing vegetables and base sauces is free and listed as 'nélkül'", () => {
    const l = priceLine(line("sima-pita", { hus: ["csirke"], zoldseg: ["hagyma", "repa"], alapszosz: ["csipos"] }), index);
    expect(l.unitPrice).toBe(2380);
    expect(l.modifiers.filter((m) => m.removed).map((m) => m.name)).toEqual([
      "Hagyma nélkül",
      "Répa nélkül",
      "Csípős szósz nélkül",
    ]);
  });

  it("multiplies by quantity", () => {
    expect(priceLine(line("ayran", {}, 3), index).lineTotal).toBe(3 * 390);
  });

  it("first sauce is free on Ropogós Falatok, the cheapest one if several", () => {
    const one = priceLine(line("classic-nuggets-tal", { koret: ["hasab"], "szosz-arban": ["cheddar"] }), index);
    expect(one.unitPrice).toBe(1880);
    const two = priceLine(line("classic-nuggets-tal", { koret: ["hasab"], "szosz-arban": ["cheddar", "curry"] }), index);
    expect(two.unitPrice).toBe(1880 + 480);
  });

  it("requires a meat choice and a side on plates", () => {
    expect(() => priceLine(line("sima-tal", { hus: ["csirke"] }), index)).toThrowError(PricingError);
    expect(() => priceLine(line("sima-tal", { koret: ["hasab"] }), index)).toThrowError(/Hús/);
  });

  it("Mix and Falafel have no meat choice", () => {
    expect(() => priceLine(line("mix-durum", { hus: ["borju"] }), index)).toThrowError(PricingError);
    expect(priceLine(line("falafel-tal", { koret: ["rizs"] }), index).unitPrice).toBe(3280);
  });

  it("rejects unknown products, options and quantities", () => {
    expect(() => priceLine(line("hamburger"), index)).toThrowError(/nem szerepel/);
    expect(() => priceLine(line("sima-durum", { hus: ["birka"] }), index)).toThrowError(PricingError);
    expect(() => priceLine(line("ayran", {}, 0), index)).toThrowError(PricingError);
    expect(() => priceLine(line("ayran", {}, 21), index)).toThrowError(PricingError);
    expect(() => priceLine({ productId: "ayran", quantity: 1.5, selections: {} }, index)).toThrowError(PricingError);
  });

  it("rejects sold-out products and options", () => {
    const cat = structuredClone(seedCatalog);
    cat.products.find((p) => p.id === "ayran")!.available = false;
    cat.modifierGroups.find((g) => g.id === "hus")!.options.find((o) => o.id === "borju")!.available = false;
    const idx = indexCatalog(cat);
    expect(() => priceLine(line("ayran"), idx)).toThrowError(/nem elérhető/);
    expect(() => priceLine(line("sima-durum", { hus: ["borju"] }), idx)).toThrowError(/nem elérhető/);
  });

  it("ignores duplicate option ids instead of charging twice", () => {
    const l = priceLine(line("sima-durum", { hus: ["csirke"], extraszosz: ["curry", "curry"] }), index);
    expect(l.unitPrice).toBe(2480 + 380);
  });
});

describe("priceCart", () => {
  it("sums lines and rejects an empty cart", () => {
    const { subtotal } = priceCart(
      [line("sima-durum", { hus: ["borju"] }, 2), line("udito-033", { "udito-iz": ["pepsi"] })],
      index,
    );
    expect(subtotal).toBe(2 * 2980 + 580);
    expect(() => priceCart([], index)).toThrowError(/üres/);
  });
});

describe("seed menu", () => {
  it("every product's default selections are a valid order", () => {
    for (const p of seedCatalog.products) {
      const selections = defaultSelections(p, index);
      // Groups without a default (drink flavours) need the first option.
      for (const gid of p.modifierGroupIds) {
        const g = index.groups.get(gid)!;
        if (g.min > 0 && g.type !== "remove" && selections[gid].length === 0) selections[gid] = [g.options[0].id];
      }
      expect(() => priceLine({ productId: p.id, quantity: 1, selections }, index), p.id).not.toThrow();
    }
  });

  it("has unique product ids and no hamburger", () => {
    const ids = seedCatalog.products.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.includes("burger"))).toBe(false);
  });
});

describe("formatHuf", () => {
  it("formats with a thin space", () => {
    expect(formatHuf(3380)).toBe("3\u202f380 Ft");
    expect(formatHuf(990)).toBe("990 Ft");
  });
});
