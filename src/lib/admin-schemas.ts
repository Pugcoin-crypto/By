import { z } from "zod";

const id = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/, "Csak kisbetű, szám és kötőjel.");
const money = z.number().int().min(0).max(1_000_000);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "ÓÓ:PP formátum");

export const productSchema = z.object({
  id,
  categoryId: id,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
  price: money,
  imageUrl: z.union([z.literal(""), z.url().max(500)]).optional(),
  badges: z.array(z.enum(["nepszeru", "vega", "csipos"])).max(3),
  available: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
  modifierGroupIds: z.array(id).max(20),
});

export const modifierGroupSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(60),
    type: z.enum(["single", "multi", "remove"]),
    min: z.number().int().min(0).max(20),
    max: z.number().int().min(1).max(20),
    freeCount: z.number().int().min(0).max(20),
    defaultOptionId: id.optional(),
    options: z
      .array(
        z.object({
          id,
          name: z.string().trim().min(1).max(60),
          description: z.string().trim().max(200).optional(),
          priceDelta: money,
          available: z.boolean(),
        }),
      )
      .min(1)
      .max(30),
  })
  .refine((g) => g.min <= g.max, { message: "A minimum nem lehet nagyobb a maximumnál.", path: ["min"] })
  .refine((g) => new Set(g.options.map((o) => o.id)).size === g.options.length, { message: "Ismétlődő opció azonosító.", path: ["options"] });

export const categorySchema = z.object({
  id,
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).optional(),
  sortOrder: z.number().int().min(0).max(10_000),
  active: z.boolean(),
});

export const zoneSchema = z.object({
  id,
  city: z.string().trim().min(2).max(60),
  postcodes: z.array(z.string().regex(/^\d{4}$/)).min(1).max(10),
  fee: money,
  minOrderValue: money,
  etaMinutes: z.number().int().min(5).max(240),
  active: z.boolean(),
});

export const settingsPatchSchema = z
  .object({
    acceptingOrders: z.boolean(),
    pauseMessage: z.string().trim().max(200),
    openingHours: z.array(z.object({ intervals: z.array(z.object({ open: hhmm, close: hhmm })).max(3) })).length(7),
    minOrderValue: money,
    defaultEtaMinutes: z.number().int().min(5).max(240),
    pickupEtaMinutes: z.number().int().min(5).max(240),
    phone: z.string().trim().max(20),
    address: z.string().trim().max(120),
  })
  .partial();

/** Fields a "staff" member (not admin) may change: the pause switch. */
export const STAFF_SETTINGS_FIELDS = ["acceptingOrders", "pauseMessage"] as const;

export const orderActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    from: z.enum(["new", "accepted", "on_the_way", "ready", "completed", "rejected"]),
    to: z.enum(["accepted", "on_the_way", "ready", "completed", "rejected"]),
    etaMinutes: z.number().int().min(5).max(240).optional(),
    rejectReason: z.string().trim().min(2).max(200).optional(),
  }),
  z.object({ action: z.literal("eta"), etaMinutes: z.number().int().min(5).max(240) }),
]);
