import { requirePermission } from "@/server/auth/authorization";
import { connectToDatabase } from "@/server/db/connect";
import { TicketModel } from "@/server/db/models/ticket.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { UserModel } from "@/server/db/models/user.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import type { CashierQueueResponse } from "@/shared/cashier/schemas";

export async function getCashierQueue(): Promise<CashierQueueResponse> {
  await requirePermission("payment:create");
  await connectToDatabase();

  const closedTickets = await TicketModel.find({ status: "CLOSED" })
    .sort({ closedAt: 1 })
    .lean();

  if (closedTickets.length === 0) {
    return { tickets: [] };
  }

  const tableIds = [...new Set(closedTickets.map((t) => t.tableId))];
  const waiterIds = [...new Set(closedTickets.map((t) => t.waiterId))];
  const ticketIds = closedTickets.map((t) => t._id);

  const [tables, waiters, orderLines] = await Promise.all([
    RestaurantTableModel.find({ _id: { $in: tableIds } }).lean(),
    UserModel.find({ _id: { $in: waiterIds } }).lean(),
    OrderLineModel.find({
      ticketId: { $in: ticketIds },
      status: { $ne: "VOID" },
    }).lean(),
  ]);

  const tableMap = new Map(tables.map((t) => [t._id.toString(), t.label]));
  const waiterMap = new Map(waiters.map((w) => [w._id.toString(), w.name]));

  const ticketLinesMap = new Map<
    string,
    { quantity: number; nameSnapshot: string }[]
  >();
  for (const line of orderLines) {
    const tId = line.ticketId.toString();
    if (!ticketLinesMap.has(tId)) {
      ticketLinesMap.set(tId, []);
    }
    ticketLinesMap.get(tId)!.push({
      quantity: line.quantity,
      nameSnapshot: line.nameSnapshot,
    });
  }

  const tickets = closedTickets.map((t) => {
    const tIdStr = t._id.toString();
    return {
      id: tIdStr,
      ticketNo: t.ticketNo as number,
      tableId: t.tableId.toString(),
      tableLabel: tableMap.get(t.tableId.toString()) || "Unknown Table",
      waiterId: t.waiterId.toString(),
      waiterName: waiterMap.get(t.waiterId.toString()) || "Unknown Waiter",
      status: t.status as "CLOSED",
      guestCount: t.guestCount as number,
      closedAt: (t.closedAt ?? t.updatedAt).toISOString(),
      subtotalMinor: t.subtotalMinor || 0,
      taxMinor: t.taxMinor || 0,
      serviceChargeMinor: t.serviceChargeMinor || 0,
      totalMinor: t.totalMinor || 0,
      lineSummary: ticketLinesMap.get(tIdStr) || [],
    };
  });

  return { tickets };
}
