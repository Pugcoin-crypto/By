// Initial menu, settings and delivery zones for Erden's Kebab · Monor.
// Source: the restaurant's menu screenshots and Gabor's decisions (2026-11-27).
// This is only the starting data; afterwards the admin edits it in the database.

import type {
  Catalog,
  Category,
  DeliveryZone,
  ModifierGroup,
  ModifierOption,
  Product,
  StoreSettings,
} from "./types";
import { slug } from "./slug";

export { slug };

const opt = (id: string, name: string, priceDelta = 0, description?: string): ModifierOption => ({
  id,
  name,
  priceDelta,
  available: true,
  ...(description ? { description } : {}),
});

// ---------------------------------------------------------------- modifiers

const extraSauceOptions = [
  opt("andalouse", "Andalouse", 380, "Enyhén pikáns, paradicsomos-paprikás majonéz"),
  opt("hannibal", "Hannibal", 380, "Édeskés majonéz pirított hagymadarabokkal"),
  opt("curry", "Curry", 380, "Kellemesen fűszeres és édeskés curry"),
  opt("samurai", "Samurai", 380, "Csípős, chilis majonéz"),
  opt("tartar", "Tartármártás", 380),
  opt("cheddar", "Cheddar sajtszósz", 480),
];

export const modifierGroups: ModifierGroup[] = [
  {
    id: "hus",
    name: "Hús",
    type: "single",
    min: 1,
    max: 1,
    freeCount: 0,
    defaultOptionId: "csirke",
    options: [opt("csirke", "Csirkehús"), opt("borju", "Borjúhús", 500)],
  },
  {
    id: "koret",
    name: "Köret",
    type: "single",
    min: 1,
    max: 1,
    freeCount: 0,
    defaultOptionId: "hasab",
    options: [opt("hasab", "Hasábburgonya"), opt("rizs", "Jázmin rizs")],
  },
  {
    id: "zoldseg",
    name: "Zöldségek (kivehető)",
    type: "remove",
    min: 0,
    max: 4,
    freeCount: 0,
    options: [
      opt("salata", "Saláta"),
      opt("repa", "Répa"),
      opt("lilakaposzta", "Lilakáposzta"),
      opt("hagyma", "Hagyma"),
    ],
  },
  {
    id: "alapszosz",
    name: "Alap szószok (kivehető)",
    type: "remove",
    min: 0,
    max: 2,
    freeCount: 0,
    options: [opt("fokhagymas", "Fokhagymás szósz"), opt("csipos", "Csípős szósz")],
  },
  {
    id: "extraszosz",
    name: "Extra szósz",
    type: "multi",
    min: 0,
    max: extraSauceOptions.length,
    freeCount: 0,
    options: extraSauceOptions,
  },
  {
    id: "extrahus",
    name: "Extra hús",
    type: "multi",
    min: 0,
    max: 2,
    freeCount: 0,
    options: [opt("extra-csirke", "Extra csirkehús", 990), opt("extra-borju", "Extra borjúhús", 1200)],
  },
  {
    // "Ropogós Falatok" plates: one sauce is included in the price.
    id: "szosz-arban",
    name: "Szósz (1 az árban)",
    type: "multi",
    min: 0,
    max: 8,
    freeCount: 1,
    options: [
      opt("fokhagymas", "Fokhagymás", 380),
      opt("csipos", "Csípős", 380),
      ...extraSauceOptions,
    ],
  },
  {
    // "Extrák" meat portions: sauce optional.
    id: "szosz-opcio",
    name: "Szósz",
    type: "single",
    min: 0,
    max: 1,
    freeCount: 0,
    options: [opt("fokhagymas", "Fokhagymás"), opt("csipos", "Csípős")],
  },
  {
    id: "udito-iz",
    name: "Íz",
    type: "single",
    min: 1,
    max: 1,
    freeCount: 0,
    options: [
      opt("pepsi", "Pepsi"),
      opt("pepsi-max", "Pepsi Max"),
      opt("7up", "7Up"),
      opt("mountain-dew", "Mountain Dew"),
      opt("schweppes", "Schweppes"),
      opt("lipton", "Lipton Ice Tea"),
      opt("toma", "Toma"),
    ],
  },
  {
    id: "viz",
    name: "Típus",
    type: "single",
    min: 1,
    max: 1,
    freeCount: 0,
    defaultOptionId: "mentes",
    options: [opt("mentes", "Szénsavmentes"), opt("szensavas", "Szénsavas")],
  },
  {
    id: "hell-025",
    name: "Íz",
    type: "single",
    min: 1,
    max: 1,
    freeCount: 0,
    options: [
      opt("classic", "Classic"),
      opt("black-cherry", "Black Cherry"),
      opt("yuzu-cherry", "Yuzu-Cherry"),
      opt("strong-red-grape", "Strong Red Grape"),
    ],
  },
  {
    id: "hell-05",
    name: "Íz",
    type: "single",
    min: 1,
    max: 1,
    freeCount: 0,
    options: [
      opt("tropical-ride", "Tropical Ride"),
      opt("big-bubbles", "Big Bubbles"),
      opt("jungle-treasure", "Jungle Treasure"),
    ],
  },
  {
    id: "xixo",
    name: "Íz",
    type: "single",
    min: 1,
    max: 1,
    freeCount: 0,
    options: [opt("citrom", "Citrom"), opt("eper", "Eper"), opt("barack", "Barack")],
  },
];

// ---------------------------------------------------------------- categories

export const categories: Category[] = [
  { id: "kebab-tal", name: "Kebab Tál", description: "Köret (hasábburgonya vagy jázmin rizs), friss zöldségek és szósz az árban", sortOrder: 1, active: true },
  { id: "durum", name: "Dürüm", description: "Tortillába tekerve, friss zöldségekkel", sortOrder: 2, active: true },
  { id: "pita", name: "Pita", description: "Frissen sült pitában, friss zöldségekkel", sortOrder: 3, active: true },
  { id: "ropogos", name: "Ropogós Falatok", description: "Tálak köret (hasábburgonya vagy jázmin rizs) és 1 szósz árával", sortOrder: 4, active: true },
  { id: "extrak", name: "Extrák", description: "Kebabhús köret és zöldség nélkül, szósszal vagy anélkül", sortOrder: 5, active: true },
  { id: "koretek", name: "Köretek", sortOrder: 6, active: true },
  { id: "szoszok", name: "Szószok", description: "Extra szósz külön adagban", sortOrder: 7, active: true },
  { id: "baklava", name: "Baklava", sortOrder: 8, active: true },
  { id: "italok", name: "Italok", sortOrder: 9, active: true },
];

// ---------------------------------------------------------------- products

type P = Omit<Product, "available" | "sortOrder" | "badges"> & { badges?: Product["badges"] };

const meatWrapGroups = ["hus", "zoldseg", "alapszosz", "extraszosz", "extrahus"];
const mixWrapGroups = ["zoldseg", "alapszosz", "extraszosz", "extrahus"];
const falafelWrapGroups = ["zoldseg", "alapszosz", "extraszosz"];
const plate = (groups: string[]) => [groups[0] === "hus" ? "hus" : null, "koret", ...groups.filter((g) => g !== "hus")].filter(Boolean) as string[];

const kebabFamily = (
  categoryId: string,
  suffix: string,
  prices: { sima: number; feta: number; antalya: number; istanbul: number; mix: number; falafel: number },
  isPlate: boolean,
  tail: string,
): P[] => {
  const g = (groups: string[]) => (isPlate ? plate(groups) : groups);
  return [
    { id: `sima-${suffix}`, categoryId, name: `Sima ${suffix}`, description: `Csirke- vagy borjúhús, friss zöldségek${tail}`, price: prices.sima, modifierGroupIds: g(meatWrapGroups), badges: ["nepszeru"] },
    { id: `feta-${suffix}`, categoryId, name: `Feta ${suffix}`, description: `Csirke- vagy borjúhús, feta, friss zöldségek${tail}`, price: prices.feta, modifierGroupIds: g(meatWrapGroups) },
    { id: `antalya-${suffix}`, categoryId, name: `Antalya ${suffix}`, description: `Csirke- vagy borjúhús, ananász, kukorica, friss zöldségek${tail}`, price: prices.antalya, modifierGroupIds: g(meatWrapGroups) },
    { id: `istanbul-${suffix}`, categoryId, name: `Istanbul ${suffix}`, description: `Csirke- vagy borjúhús, paprika, kukorica, feta, friss zöldségek${tail}`, price: prices.istanbul, modifierGroupIds: g(meatWrapGroups) },
    { id: `mix-${suffix}`, categoryId, name: `Mix ${suffix}`, description: `Csirke- és borjúhús vegyesen, friss zöldségek${tail}`, price: prices.mix, modifierGroupIds: g(mixWrapGroups) },
    { id: `falafel-${suffix}`, categoryId, name: `Falafel ${suffix}`, description: `Ropogós falafel, friss zöldségek${tail}`, price: prices.falafel, modifierGroupIds: g(falafelWrapGroups), badges: ["vega"] },
  ];
};

const rawProducts: P[] = [
  ...kebabFamily("kebab-tal", "tál", { sima: 3380, feta: 3780, antalya: 3780, istanbul: 4180, mix: 3780, falafel: 3280 }, true, ", választható köret és szósz."),
  ...kebabFamily("durum", "dürüm", { sima: 2480, feta: 2880, antalya: 2880, istanbul: 3280, mix: 2880, falafel: 2380 }, false, ", szósz."),
  ...kebabFamily("pita", "pita", { sima: 2380, feta: 2780, antalya: 2780, istanbul: 3180, mix: 2780, falafel: 2280 }, false, ", szósz."),

  { id: "classic-nuggets-tal", categoryId: "ropogos", name: "Classic Nuggets tál", description: "Gyerekeknek is. Csirke nuggets, választható köret és 1 szósz.", price: 1880, modifierGroupIds: ["koret", "szosz-arban"], badges: ["nepszeru"] },
  { id: "chili-cheese-nuggets-tal", categoryId: "ropogos", name: "Chili Cheese Nuggets tál", description: "Csípős-sajtos falatok, választható köret és 1 szósz.", price: 1880, modifierGroupIds: ["koret", "szosz-arban"], badges: ["csipos"] },
  { id: "rantott-csirkemell-tal", categoryId: "ropogos", name: "Rántott csirkemell csíkok tál", description: "Ropogós csirkemell csíkok, választható köret és 1 szósz.", price: 2980, modifierGroupIds: ["koret", "szosz-arban"] },
  { id: "rantott-sajt-tal", categoryId: "ropogos", name: "Rántott sajt tál", description: "Rántott sajt, választható köret és 1 szósz.", price: 2680, modifierGroupIds: ["koret", "szosz-arban"] },

  { id: "extra-csirkehus", categoryId: "extrak", name: "Extra csirkehús", description: "Egy adag kebab csirkehús magában, köret és zöldség nélkül.", price: 990, modifierGroupIds: ["szosz-opcio"] },
  { id: "extra-borjuhus", categoryId: "extrak", name: "Extra borjúhús", description: "Egy adag kebab borjúhús magában, köret és zöldség nélkül.", price: 1200, modifierGroupIds: ["szosz-opcio"] },
  { id: "pita-kenyer", categoryId: "extrak", name: "Pita kenyér", description: "Egy frissen sült pita magában – a húshoz.", price: 400, modifierGroupIds: [], badges: ["vega"] },

  { id: "hasabburgonya", categoryId: "koretek", name: "Hasábburgonya", description: "Egy adag ropogós hasábburgonya.", price: 1180, modifierGroupIds: [], badges: ["vega"] },
  { id: "jazmin-rizs", categoryId: "koretek", name: "Jázmin rizs", description: "Egy adag párolt jázmin rizs.", price: 1180, modifierGroupIds: [], badges: ["vega"] },

  { id: "fokhagymas-szosz", categoryId: "szoszok", name: "Fokhagymás szósz", description: "A ház alapszósza.", price: 380, modifierGroupIds: [] },
  { id: "csipos-szosz", categoryId: "szoszok", name: "Csípős szósz", price: 380, modifierGroupIds: [], badges: ["csipos"] },
  { id: "andalouse-szosz", categoryId: "szoszok", name: "Andalouse szósz", description: "Enyhén pikáns, paradicsomos-paprikás majonéz.", price: 380, modifierGroupIds: [] },
  { id: "hannibal-szosz", categoryId: "szoszok", name: "Hannibal szósz", description: "Édeskés majonéz pirított hagymadarabokkal.", price: 380, modifierGroupIds: [] },
  { id: "curry-szosz", categoryId: "szoszok", name: "Curry szósz", description: "Kellemesen fűszeres, édeskés curry ízvilág.", price: 380, modifierGroupIds: [] },
  { id: "samurai-szosz", categoryId: "szoszok", name: "Samurai szósz", description: "Csípős, chilis majonéz.", price: 380, modifierGroupIds: [], badges: ["csipos"] },
  { id: "tartarmartas", categoryId: "szoszok", name: "Tartármártás", description: "Klasszikus majonézmártás.", price: 380, modifierGroupIds: [] },
  { id: "cheddar-sajtszosz", categoryId: "szoszok", name: "Cheddar sajtszósz", description: "Meleg sajtszósz.", price: 480, modifierGroupIds: [] },

  { id: "pisztacias-baklava", categoryId: "baklava", name: "Pisztáciás baklava", description: "Ropogós leveles tészta, pisztácia, szirup.", price: 680, modifierGroupIds: [] },
  { id: "dios-baklava", categoryId: "baklava", name: "Diós baklava", description: "Ropogós leveles tészta, dió, szirup.", price: 580, modifierGroupIds: [] },
  { id: "csokis-baklava", categoryId: "baklava", name: "Csokis baklava", description: "Ropogós leveles tészta csokoládéval.", price: 580, modifierGroupIds: [] },

  { id: "udito-033", categoryId: "italok", name: "Üdítő 0,33 l", description: "Pepsi, 7Up, Mountain Dew, Schweppes, Lipton Ice Tea, Toma.", price: 580, modifierGroupIds: ["udito-iz"] },
  { id: "udito-05", categoryId: "italok", name: "Üdítő 0,5 l", description: "Pepsi, 7Up, Mountain Dew, Schweppes, Lipton Ice Tea, Toma.", price: 680, modifierGroupIds: ["udito-iz"] },
  { id: "ayran", categoryId: "italok", name: "Ayran", description: "Hideg, sós joghurtital – a kebab klasszikus kísérője.", price: 390, modifierGroupIds: [] },
  { id: "asvanyviz", categoryId: "italok", name: "Ásványvíz", description: "Szentkirályi, szénsavmentes vagy szénsavas.", price: 480, modifierGroupIds: ["viz"] },
  { id: "hell-025", categoryId: "italok", name: "Hell energiaital 0,25 l", description: "Classic, Black Cherry, Yuzu-Cherry, Strong Red Grape.", price: 480, modifierGroupIds: ["hell-025"] },
  { id: "hell-05", categoryId: "italok", name: "Hell energiaital 0,5 l", description: "Tropical Ride, Big Bubbles, Jungle Treasure.", price: 680, modifierGroupIds: ["hell-05"] },
  { id: "xixo-025", categoryId: "italok", name: "Xixo 0,25 l", description: "Jeges tea – citromos, epres vagy barackos.", price: 380, modifierGroupIds: ["xixo"] },
];

export const products: Product[] = rawProducts.map((p, i) => ({
  ...p,
  id: slug(p.id),
  badges: p.badges ?? [],
  available: true,
  sortOrder: i + 1,
}));

export const seedCatalog: Catalog = { categories, products, modifierGroups };

// ---------------------------------------------------------------- settings

const day = { intervals: [{ open: "10:30", close: "20:00" }] };

export const seedSettings: StoreSettings = {
  name: "Erden's Kebab · Monor",
  phone: "+36305285188",
  address: "Monor",
  timezone: "Europe/Budapest",
  acceptingOrders: true,
  openingHours: [day, day, day, day, day, day, day],
  minOrderValue: 0,
  defaultEtaMinutes: 40,
  pickupEtaMinutes: 20,
};

const zone = (id: string, city: string, postcode: string, fee: number): DeliveryZone => ({
  id,
  city,
  postcodes: [postcode],
  fee,
  minOrderValue: 0,
  etaMinutes: fee === 0 ? 40 : 50,
  active: true,
});

export const seedZones: DeliveryZone[] = [
  zone("monor", "Monor", "2200", 0),
  zone("monorierdo", "Monorierdő", "2213", 800),
  zone("vasad", "Vasad", "2211", 800),
  zone("csevharaszt", "Csévharaszt", "2212", 800),
  zone("peteri", "Péteri", "2209", 800),
  zone("gomba", "Gomba", "2217", 800),
  zone("benye", "Bénye", "2216", 800),
];
