// Domain types shared by the storefront, the admin and the server.
// All money values are whole forints (HUF, integer).

export type Badge = "nepszeru" | "vega" | "csipos";

export interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  active: boolean;
}

export interface ModifierOption {
  id: string;
  name: string;
  description?: string;
  /** Added to the unit price when chosen. For "remove" groups this is always 0. */
  priceDelta: number;
  available: boolean;
}

/**
 * - "single": pick exactly one (when min = 1) or at most one (min = 0).
 * - "multi":  pick between min and max options.
 * - "remove": every option is included by default; the selection lists what
 *             the customer asked to leave out (e.g. "hagyma nélkül").
 */
export type ModifierGroupType = "single" | "multi" | "remove";

export interface ModifierGroup {
  id: string;
  /** Name shown to the customer, e.g. "Hús", "Extra szósz". */
  name: string;
  type: ModifierGroupType;
  min: number;
  max: number;
  /** Number of chosen options that are free (the cheapest ones). */
  freeCount: number;
  /** Option chosen up front in the UI ("single" groups only). */
  defaultOptionId?: string;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  badges: Badge[];
  available: boolean;
  sortOrder: number;
  /** Order in which the groups are shown in the customisation sheet. */
  modifierGroupIds: string[];
}

export interface Catalog {
  categories: Category[];
  products: Product[];
  modifierGroups: ModifierGroup[];
}

export interface OpeningInterval {
  /** "HH:MM", local time in Europe/Budapest. */
  open: string;
  close: string;
}

export interface StoreSettings {
  name: string;
  phone: string;
  address: string;
  timezone: string;
  acceptingOrders: boolean;
  pauseMessage?: string;
  /**
   * Index 0 = Sunday … 6 = Saturday, like Date#getDay(). Wrapped in an object
   * because Firestore does not allow nested arrays.
   */
  openingHours: { intervals: OpeningInterval[] }[];
  minOrderValue: number;
  defaultEtaMinutes: number;
  pickupEtaMinutes: number;
}

export interface DeliveryZone {
  id: string;
  city: string;
  postcodes: string[];
  fee: number;
  minOrderValue: number;
  etaMinutes: number;
  active: boolean;
}

export type Fulfillment = "delivery" | "pickup";
export type PaymentMethod = "cash" | "card_on_delivery";

export type OrderStatus =
  | "new"
  | "accepted"
  | "on_the_way"
  | "ready"
  | "completed"
  | "rejected";

/** What the browser sends for one cart line. Prices are never trusted. */
export interface CartLineInput {
  productId: string;
  quantity: number;
  /** groupId → chosen option ids (for "remove" groups: the removed ones). */
  selections: Record<string, string[]>;
}

export interface PricedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  priceDelta: number;
  removed: boolean;
}

export interface PricedLine {
  productId: string;
  name: string;
  quantity: number;
  basePrice: number;
  modifiers: PricedModifier[];
  unitPrice: number;
  lineTotal: number;
}

export interface Address {
  zip: string;
  city: string;
  street: string;
  floor?: string;
  door?: string;
  bell?: string;
}

export interface Customer {
  name: string;
  /** Normalised to +36XXXXXXXXX. */
  phone: string;
}

export interface StatusChange {
  status: OrderStatus;
  at: string; // ISO timestamp
  by?: string;
}

export interface Order {
  id: string;
  number: string;
  trackingToken: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  customer: Customer;
  address?: Address;
  zoneId?: string;
  note?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid" | "paid";
  items: PricedLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  etaMinutes: number;
  /** ISO timestamp of the promised ready / delivery time. */
  etaAt: string;
  rejectReason?: string;
  statusHistory: StatusChange[];
  createdAt: string;
}

/** The public, PII-free view a customer sees on the tracking page. */
export interface OrderTracking {
  token: string;
  number: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  etaAt: string;
  rejectReason?: string;
  items: { name: string; quantity: number; details: string[] }[];
  total: number;
  createdAt: string;
}

/** Everything the storefront needs, as served by GET /api/menu. */
export interface PublicMenu {
  categories: Category[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  zones: Pick<DeliveryZone, "id" | "city" | "postcodes" | "fee" | "minOrderValue" | "etaMinutes">[];
  store: {
    name: string;
    phone: string;
    openingHours: StoreSettings["openingHours"];
    minOrderValue: number;
    state: { open: true } | { open: false; reason: "paused" | "closed"; message: string };
  };
}
