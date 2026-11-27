import { z } from "zod";
import { MAX_LINES, MAX_QUANTITY_PER_LINE } from "./pricing";

const id = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);
const text = (max: number) => z.string().trim().max(max);

export const cartLineSchema = z.object({
  productId: id,
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
  selections: z.record(id, z.array(id).max(20)).default({}),
});

export const addressSchema = z.object({
  zip: z.string().trim().regex(/^\d{4}$/, "Az irányítószám 4 számjegy."),
  city: text(60).min(2, "Add meg a települést."),
  street: text(120).min(3, "Add meg az utcát és a házszámot."),
  floor: text(20).optional(),
  door: text(20).optional(),
  bell: text(40).optional(),
});

export const placeOrderSchema = z
  .object({
    fulfillment: z.enum(["delivery", "pickup"]),
    customer: z.object({
      name: text(80).min(2, "Add meg a neved."),
      phone: text(30).min(6, "Add meg a telefonszámod."),
    }),
    address: addressSchema.optional(),
    note: text(500).optional(),
    paymentMethod: z.enum(["cash", "card_on_delivery"]),
    items: z.array(cartLineSchema).min(1, "A kosár üres.").max(MAX_LINES),
    /** Honeypot: real users never fill it. */
    website: z.string().max(0).optional(),
  })
  .refine((o) => o.fulfillment === "pickup" || !!o.address, {
    message: "Házhozszállításhoz add meg a címet.",
    path: ["address"],
  });

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
