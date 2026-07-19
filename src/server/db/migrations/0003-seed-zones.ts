import { RestaurantTableModel } from "../models/restaurant-table.model";
import { ZoneModel } from "../models/zone.model";

export const id = "0003-seed-zones";

export async function up() {
  const existingTables = await RestaurantTableModel.find(
    {},
    { zone: 1 },
  ).lean();

  const zoneNames = new Set<string>();
  existingTables.forEach((t) => {
    if (t.zone) {
      zoneNames.add(t.zone);
    }
  });

  if (zoneNames.size === 0) {
    // Default zones if no tables exist
    zoneNames.add("Main Hall");
    zoneNames.add("Patio");
  }

  const existingZones = await ZoneModel.find({}, { name: 1 }).lean();
  const existingZoneNames = new Set(existingZones.map((z) => z.name));

  const toCreate = Array.from(zoneNames)
    .filter((name) => !existingZoneNames.has(name))
    .map((name, index) => ({
      name,
      isActive: true,
      sortOrder: index,
    }));

  if (toCreate.length > 0) {
    await ZoneModel.insertMany(toCreate);
  }
}

export async function down() {
  await ZoneModel.deleteMany({});
}
