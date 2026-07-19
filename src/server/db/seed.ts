import {
  RestaurantSettingsModel,
  PermissionModel,
  RoleModel,
  StationModel,
} from "./models";

export type SeedResult = {
  created: number;
  failed: number;
  skipped: number;
  updated: number;
};

import {
  permissionCatalog,
  defaultRoleBundles,
} from "@/shared/authorization/permissions";

export async function seedDatabase(): Promise<SeedResult> {
  const result: SeedResult = { created: 0, failed: 0, skipped: 0, updated: 0 };

  for (const [key, group, label] of permissionCatalog) {
    const write = await PermissionModel.updateOne(
      { key },
      { $set: { group, key, label } },
      { upsert: true },
    );
    result.created += write.upsertedCount;
    result.updated += write.modifiedCount;
    result.skipped +=
      write.matchedCount > 0 && write.modifiedCount === 0 ? 1 : 0;
  }

  for (const role of defaultRoleBundles) {
    const write = await RoleModel.updateOne(
      { name: role.name },
      { $set: { ...role, isSystem: true } },
      { upsert: true },
    );
    result.created += write.upsertedCount;
    result.updated += write.modifiedCount;
    result.skipped +=
      write.matchedCount > 0 && write.modifiedCount === 0 ? 1 : 0;
  }

  for (const station of [
    { name: "Kitchen", type: "KITCHEN" },
    { name: "Bar", type: "BAR" },
  ] as const) {
    const write = await StationModel.updateOne(
      { type: station.type },
      { $set: { ...station, isActive: true } },
      { upsert: true },
    );
    result.created += write.upsertedCount;
    result.updated += write.modifiedCount;
    result.skipped +=
      write.matchedCount > 0 && write.modifiedCount === 0 ? 1 : 0;
  }

  const settingsWrite = await RestaurantSettingsModel.updateOne(
    { key: "default" },
    {
      $setOnInsert: {
        currency: "LKR",
        currencyMinorDigits: 2,
        kitchenAgingMinutes: 12,
        key: "default",
        readySoundEnabled: true,
        receiptFooter: "Thank you for dining with us.",
        restaurantName: "My Restaurant",
        restaurantAddress: "123 Main St, Cityville",
        restaurantPhone: "+1 (555) 123-4567",
        restaurantEmail: "hello@myrestaurant.invalid",
        serviceChargeBps: 0,
        taxBps: 0,
        urgentAgingMinutes: 20,
      },
    },
    { upsert: true },
  );
  result.created += settingsWrite.upsertedCount;
  result.skipped += settingsWrite.matchedCount > 0 ? 1 : 0;

  return result;
}
