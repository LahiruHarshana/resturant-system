import "server-only";

import { StationModel } from "../db/models/station.model";
import { OrderLineModel } from "../db/models/order-line.model";
import { TicketModel } from "../db/models/ticket.model";
import { RestaurantTableModel } from "../db/models/restaurant-table.model";

import type {
  StationQueueDTO,
  StationQueueLineDTO,
  UpdateLineStatusDTO,
} from "../../shared/station/schemas";
import mongoose from "mongoose";
import { AuditLogModel } from "../db/models/audit-log.model";
import { publishToStation, publishToTable } from "../realtime/publish";

export async function getStationQueue(
  stationId: string,
): Promise<StationQueueDTO> {
  const station = await StationModel.findById(stationId).lean();
  if (!station) {
    throw new Error("Station not found");
  }

  // Find all active order lines for this station
  // Sort by firedAt ascending to process oldest first
  const lines = await OrderLineModel.find({
    stationId,
    status: { $in: ["NEW", "PREPARING"] },
  })
    .sort({ firedAt: 1 })
    .lean();

  if (lines.length === 0) {
    return { lines: [] };
  }

  // Collect ticket IDs
  const ticketIds = Array.from(new Set(lines.map((l) => String(l.ticketId))));

  // Fetch tickets to get table IDs and ticket numbers
  const tickets = await TicketModel.find({
    _id: { $in: ticketIds },
  }).lean();

  const ticketMap = new Map(tickets.map((t) => [String(t._id), t]));

  // Collect table IDs
  const tableIds = Array.from(
    new Set(tickets.map((t) => String(t.tableId)).filter(Boolean)),
  );

  const tables = await RestaurantTableModel.find({
    _id: { $in: tableIds },
  }).lean();

  const tableMap = new Map(tables.map((t) => [String(t._id), t]));

  // Build the DTO
  const dtos: StationQueueLineDTO[] = lines.map((line) => {
    const ticket = ticketMap.get(String(line.ticketId));
    const table = ticket?.tableId
      ? tableMap.get(String(ticket.tableId))
      : undefined;

    return {
      id: String(line._id),
      ticketId: String(line.ticketId),
      ticketNo: ticket?.ticketNo ?? 0,
      tableLabel: table?.label,
      status: line.status as StationQueueLineDTO["status"],
      itemNameSnapshot: line.nameSnapshot,
      quantity: line.quantity,
      modifierSnapshots: line.modifierSnapshots as unknown as Record<
        string,
        unknown
      >[],
      note: line.note || undefined,
      firedAt: line.firedAt?.toISOString(),
    };
  });

  return { lines: dtos };
}

export async function updateLineStatus(
  stationId: string,
  lineId: string,
  newStatus: UpdateLineStatusDTO["status"],
  userId: string,
): Promise<void> {
  const station = await StationModel.findById(stationId).lean();
  if (!station) {
    throw new Error("Station not found");
  }

  const session = await mongoose.startSession();
  let result:
    | {
        lineId: string;
        ticketId: string;
        stationId: string;
        tableId?: string;
        status: string;
        previousStatus: string;
        itemNameSnapshot: string;
      }
    | undefined;

  await session.withTransaction(async () => {
    const line = await OrderLineModel.findById(lineId).session(session);
    if (!line) {
      throw new Error("Line not found");
    }

    if (String(line.stationId) !== stationId) {
      throw new Error("Line does not belong to this station");
    }

    // Check transition
    if (newStatus === "PREPARING" && line.status !== "NEW") {
      throw new Error("Invalid transition to PREPARING");
    }

    if (newStatus === "READY" && line.status !== "PREPARING") {
      throw new Error("Invalid transition to READY");
    }

    // Verify ticket is OPEN
    const ticket = await TicketModel.findById(line.ticketId).session(session);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    if (ticket.status !== "OPEN") {
      throw new Error("Cannot update line for inactive ticket");
    }

    const previousStatus = line.status;
    line.status = newStatus;

    if (newStatus === "PREPARING") {
      line.preparingAt = new Date();
    } else if (newStatus === "READY") {
      line.readyAt = new Date();
    }

    await line.save({ session });

    // Write audit
    await AuditLogModel.create(
      [
        {
          action: "LINE_STATUS_UPDATED",
          entity: "ORDER_LINE",
          entityId: String(line._id),
          actorId: userId,
          metadata: {
            previousStatus,
            newStatus,
            ticketId: line.ticketId,
            stationId: line.stationId,
          },
        },
      ],
      { session },
    );

    result = {
      lineId: String(line._id),
      ticketId: String(line.ticketId),
      stationId: String(line.stationId),
      tableId: ticket.tableId ? String(ticket.tableId) : undefined,
      status: line.status,
      previousStatus,
      itemNameSnapshot: line.nameSnapshot,
    };
  });

  await session.endSession();

  if (!result) return;

  // Publish real-time events outside the transaction
  const timestamp = new Date().toISOString();

  // Notify the station (for UI sync)
  await publishToStation(result.stationId, "line.status-changed.v1", {
    id: result.lineId,
    ticketId: result.ticketId,
    stationId: result.stationId,
    status: result.status,
    previousStatus: result.previousStatus,
    timestamp,
  }).catch(console.error);

  // If ready, notify the table/waiter
  if (result.status === "READY" && result.tableId) {
    await publishToTable(result.tableId, "line.status-changed.v1", {
      id: result.lineId,
      ticketId: result.ticketId,
      stationId: result.stationId,
      status: result.status,
      previousStatus: result.previousStatus,
      timestamp,
    }).catch(console.error);
  }
}
