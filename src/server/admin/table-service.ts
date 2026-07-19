import { requirePermission } from "@/server/auth/authorization";
import { ZoneModel } from "@/server/db/models/zone.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import {
  ZoneSchema,
  TableSchema,
  type ZoneFormData,
  type TableFormData,
} from "@/shared/admin/schemas";
import { connectToDatabase } from "@/server/db/connect";

// --- Zones ---

export async function getZones() {
  await requirePermission("table:manage");
  await connectToDatabase();

  const zones = await ZoneModel.find().sort({ sortOrder: 1, name: 1 }).lean();
  return zones.map((z) => ({ ...z, _id: z._id.toString() }));
}

export async function createZone(data: ZoneFormData) {
  const session = await requirePermission("table:manage");
  const validated = ZoneSchema.parse(data);
  await connectToDatabase();

  const normalizedName = validated.name.trim();
  const existing = await ZoneModel.findOne({
    name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
  });

  if (existing) {
    throw new Error("A zone with this name already exists");
  }

  const zone = await ZoneModel.create({ ...validated, name: normalizedName });

  await AuditLogModel.create({
    actorId: session.userId,
    action: "CREATE_ZONE",
    entity: "Zone",
    entityId: zone._id.toString(),
    metadata: { name: zone.name },
  });

  return { success: true, zoneId: zone._id.toString() };
}

export async function updateZone(id: string, data: ZoneFormData) {
  const session = await requirePermission("table:manage");
  const validated = ZoneSchema.parse(data);
  await connectToDatabase();

  const normalizedName = validated.name.trim();
  const existing = await ZoneModel.findOne({
    _id: { $ne: id },
    name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
  });

  if (existing) {
    throw new Error("A zone with this name already exists");
  }

  // Find old zone to cascade name update if needed
  const oldZone = await ZoneModel.findById(id);
  if (!oldZone) throw new Error("Zone not found");

  const zone = await ZoneModel.findByIdAndUpdate(
    id,
    { $set: { ...validated, name: normalizedName } },
    { returnDocument: "after", runValidators: true },
  );

  if (!zone) throw new Error("Zone not found");

  if (oldZone.name !== zone.name) {
    // Cascade update to tables
    await RestaurantTableModel.updateMany(
      { zone: oldZone.name },
      { $set: { zone: zone.name } },
    );
  }

  await AuditLogModel.create({
    actorId: session.userId,
    action: "UPDATE_ZONE",
    entity: "Zone",
    entityId: zone._id.toString(),
    metadata: { name: zone.name },
  });

  return { success: true };
}

// --- Tables ---

export async function getTables() {
  await requirePermission("table:manage");
  await connectToDatabase();

  const tables = await RestaurantTableModel.find()
    .sort({ zone: 1, label: 1 })
    .lean();
  return tables.map((t) => ({ ...t, _id: t._id.toString() }));
}

export async function createTable(data: TableFormData) {
  const session = await requirePermission("table:manage");
  const validated = TableSchema.parse(data);
  await connectToDatabase();

  const normalizedLabel = validated.label.trim();
  const existing = await RestaurantTableModel.findOne({
    label: { $regex: new RegExp(`^${normalizedLabel}$`, "i") },
  });

  if (existing) {
    throw new Error("A table with this label already exists");
  }

  const table = await RestaurantTableModel.create({
    ...validated,
    label: normalizedLabel,
  });

  await AuditLogModel.create({
    actorId: session.userId,
    action: "CREATE_TABLE",
    entity: "RestaurantTable",
    entityId: table._id.toString(),
    metadata: { label: table.label, zone: table.zone },
  });

  return { success: true, tableId: table._id.toString() };
}

export async function updateTable(id: string, data: TableFormData) {
  const session = await requirePermission("table:manage");
  const validated = TableSchema.parse(data);
  await connectToDatabase();

  const normalizedLabel = validated.label.trim();
  const existing = await RestaurantTableModel.findOne({
    _id: { $ne: id },
    label: { $regex: new RegExp(`^${normalizedLabel}$`, "i") },
  });

  if (existing) {
    throw new Error("A table with this label already exists");
  }

  const table = await RestaurantTableModel.findByIdAndUpdate(
    id,
    { $set: { ...validated, label: normalizedLabel } },
    { returnDocument: "after", runValidators: true },
  );

  if (!table) throw new Error("Table not found");

  await AuditLogModel.create({
    actorId: session.userId,
    action: "UPDATE_TABLE",
    entity: "RestaurantTable",
    entityId: table._id.toString(),
    metadata: { label: table.label, status: table.status },
  });

  return { success: true };
}

export async function deleteTable(id: string) {
  const session = await requirePermission("table:manage");
  await connectToDatabase();

  const table = await RestaurantTableModel.findById(id);
  if (!table) throw new Error("Table not found");

  if (table.currentTicketId) {
    throw new Error("Cannot delete a table with an active ticket");
  }

  await RestaurantTableModel.findByIdAndDelete(id);

  await AuditLogModel.create({
    actorId: session.userId,
    action: "DELETE_TABLE",
    entity: "RestaurantTable",
    entityId: table._id.toString(),
    metadata: { label: table.label },
  });

  return { success: true };
}
