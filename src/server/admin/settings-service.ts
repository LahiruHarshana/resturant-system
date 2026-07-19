import { requirePermission } from "@/server/auth/authorization";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import {
  restaurantSettingsSchema,
  type RestaurantSettings,
} from "@/shared/contracts/restaurant-settings";
import { connectToDatabase } from "@/server/db/connect";

export async function getSettings() {
  await requirePermission("settings:manage");
  await connectToDatabase();

  const settings = await RestaurantSettingsModel.findOne({
    key: "default",
  }).lean();
  if (!settings) throw new Error("Settings not found");

  return {
    currency: settings.currency,
    currencyMinorDigits: settings.currencyMinorDigits,
    kitchenAgingMinutes: settings.kitchenAgingMinutes,
    readySoundEnabled: settings.readySoundEnabled,
    receiptFooter: settings.receiptFooter || "",
    serviceChargeBps: settings.serviceChargeBps,
    taxBps: settings.taxBps,
    urgentAgingMinutes: settings.urgentAgingMinutes,
  };
}

export async function updateSettings(data: RestaurantSettings) {
  const session = await requirePermission("settings:manage");

  // Zod schema from contracts coerces/validates
  const validated = restaurantSettingsSchema.parse(data);

  await connectToDatabase();

  const settings = await RestaurantSettingsModel.findOneAndUpdate(
    { key: "default" },
    { $set: validated },
    { returnDocument: "after", runValidators: true },
  );

  if (!settings) {
    throw new Error("Settings not found");
  }

  await AuditLogModel.create({
    actorId: session.userId,
    action: "UPDATE_SETTINGS",
    entity: "RestaurantSettings",
    entityId: settings._id.toString(),
    metadata: { currency: settings.currency, taxBps: settings.taxBps },
  });

  return { success: true };
}
