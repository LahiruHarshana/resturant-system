import { requirePermission } from "@/server/auth/authorization";
import { StationModel } from "@/server/db/models/station.model";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import { StationSchema, type StationFormData } from "@/shared/admin/schemas";
import { connectToDatabase } from "@/server/db/connect";

export async function getStations() {
  await requirePermission("menu:manage");
  await connectToDatabase();

  // Return compact projection
  const stations = await StationModel.find(
    {},
    { name: 1, type: 1, isActive: 1, sortOrder: 1 },
  )
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return stations.map((s) => ({
    ...s,
    _id: s._id.toString(),
  }));
}

export async function createStation(data: StationFormData) {
  const session = await requirePermission("menu:manage");
  const validated = StationSchema.parse(data);

  await connectToDatabase();

  const station = await StationModel.create(validated);

  await AuditLogModel.create({
    actorId: session.userId,
    action: "CREATE_STATION",
    entity: "Station",
    entityId: station._id.toString(),
    metadata: { name: station.name, type: station.type },
  });

  return { success: true, stationId: station._id.toString() };
}

export async function updateStation(id: string, data: StationFormData) {
  const session = await requirePermission("menu:manage");
  const validated = StationSchema.parse(data);

  await connectToDatabase();

  const station = await StationModel.findByIdAndUpdate(
    id,
    { $set: validated },
    { returnDocument: "after", runValidators: true },
  );

  if (!station) {
    throw new Error("Station not found");
  }

  await AuditLogModel.create({
    actorId: session.userId,
    action: "UPDATE_STATION",
    entity: "Station",
    entityId: station._id.toString(),
    metadata: {
      name: station.name,
      type: station.type,
      isActive: station.isActive,
    },
  });

  return { success: true };
}

export async function deactivateStation(id: string) {
  const session = await requirePermission("menu:manage");

  await connectToDatabase();

  const station = await StationModel.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { returnDocument: "after" },
  );

  if (!station) {
    throw new Error("Station not found");
  }

  await AuditLogModel.create({
    actorId: session.userId,
    action: "DEACTIVATE_STATION",
    entity: "Station",
    entityId: station._id.toString(),
    metadata: { reason: "Deactivated from admin" },
  });

  return { success: true };
}

export async function deleteStation(id: string) {
  const session = await requirePermission("menu:manage");

  await connectToDatabase();

  // Check references
  const menuItemsCount = await MenuItemModel.countDocuments({ stationId: id });

  if (menuItemsCount > 0) {
    throw new Error(
      `Cannot delete station. It is referenced by ${menuItemsCount} menu items. Deactivate it instead.`,
    );
  }

  const station = await StationModel.findByIdAndDelete(id);

  if (!station) {
    throw new Error("Station not found");
  }

  await AuditLogModel.create({
    actorId: session.userId,
    action: "DELETE_STATION",
    entity: "Station",
    entityId: station._id.toString(),
    metadata: { name: station.name },
  });

  return { success: true };
}
