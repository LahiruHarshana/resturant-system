import { z } from "zod";

const MAX_BASIS_POINTS = 10_000;
const MAX_RECEIPT_FOOTER_LENGTH = 500;

export const restaurantSettingsSchema = z
  .object({
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, "currency must be an uppercase ISO-style code"),
    currencyMinorDigits: z.number().int().min(0).max(4),
    kitchenAgingMinutes: z.number().int().positive(),
    readySoundEnabled: z.boolean(),
    receiptFooter: z.string().max(MAX_RECEIPT_FOOTER_LENGTH).optional(),
    restaurantName: z.string().min(1).max(100),
    restaurantAddress: z.string().max(200).optional(),
    restaurantPhone: z.string().max(50).optional(),
    restaurantEmail: z.union([z.string().email(), z.literal("")]).optional(),
    serviceChargeBps: z.number().int().min(0).max(MAX_BASIS_POINTS),
    taxBps: z.number().int().min(0).max(MAX_BASIS_POINTS),
    urgentAgingMinutes: z.number().int().positive(),
  })
  .refine(
    (settings) => settings.urgentAgingMinutes > settings.kitchenAgingMinutes,
    {
      message: "urgentAgingMinutes must be greater than kitchenAgingMinutes",
      path: ["urgentAgingMinutes"],
    },
  );

export type RestaurantSettings = z.infer<typeof restaurantSettingsSchema>;
