import { requirePermission } from "@/server/auth/authorization";
import { connectToDatabase } from "@/server/db/connect";
import { ZoneModel } from "@/server/db/models/zone.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { TicketModel } from "@/server/db/models/ticket.model";
import type { FloorZoneDTO, FloorTableDTO } from "@/shared/waiter/schemas";

export async function getFloorTables(
  zoneFilter?: string,
  statusFilter?: string,
): Promise<FloorZoneDTO[]> {
  await requirePermission("table:read");
  await connectToDatabase();

  // 1. Fetch active zones
  const zoneQuery: Record<string, unknown> = { isActive: true };
  if (zoneFilter) {
    zoneQuery.name = zoneFilter;
  }
  const zones = await ZoneModel.find(zoneQuery)
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  const activeZoneNames = zones.map((z) => z.name);

  if (activeZoneNames.length === 0) return [];

  // 2. Fetch active tables in those zones
  const tableQuery: Record<string, unknown> = {
    zone: { $in: activeZoneNames },
    status: { $ne: "INACTIVE" },
  };

  if (statusFilter) {
    tableQuery.status = statusFilter;
  }

  // Ensure TicketModel is registered before populate
  TicketModel.init();

  const tables = await RestaurantTableModel.find(tableQuery)
    .populate("currentTicketId", "ticketNo openedAt status")
    .sort({ label: 1 })
    .lean();

  // 3. Group tables by zone
  const tablesByZone = new Map<string, FloorTableDTO[]>();
  for (const zone of zones) {
    tablesByZone.set(zone.name, []);
  }

  for (const table of tables) {
    const ticket = table.currentTicketId as Record<string, unknown> | null;

    let ticketNo: number | null = null;
    let openedAt: string | null = null;
    let currentTicketId: string | null = null;

    if (ticket && ticket.status === "OPEN") {
      ticketNo = ticket.ticketNo as number;
      openedAt = ticket.openedAt
        ? (ticket.openedAt as Date).toISOString()
        : null;
      currentTicketId = String(ticket._id);
    }

    const dto: FloorTableDTO = {
      id: table._id.toString(),
      label: table.label,
      zone: table.zone,
      seats: table.seats,
      status: table.status as
        "AVAILABLE" | "OCCUPIED" | "RESERVED" | "INACTIVE",
      currentTicketId,
      openedAt,
      ticketNo,
      isReady: false, // For Guide 10, READY items are not implemented yet
    };

    if (tablesByZone.has(table.zone)) {
      tablesByZone.get(table.zone)!.push(dto);
    }
  }

  return zones.map((zone) => ({
    zoneName: zone.name,
    sortOrder: zone.sortOrder,
    tables: tablesByZone.get(zone.name) || [],
  }));
}
