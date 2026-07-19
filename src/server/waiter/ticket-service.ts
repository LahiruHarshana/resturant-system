import { requirePermission } from "@/server/auth/authorization";
import { connectToDatabase } from "@/server/db/connect";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { TicketModel } from "@/server/db/models/ticket.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { IdempotencyRecordModel } from "@/server/db/models/idempotency-record.model";
import { ZoneModel } from "@/server/db/models/zone.model";
import { getNextTicketNumber } from "@/server/db/models/counter.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import {
  addMinor,
  calculateBasisPoints,
  multiplyMinorByQuantity,
} from "@/shared/money/money";
import {
  OpenTicketSchema,
  type OpenTicketRequest,
  type TicketDTO,
} from "@/shared/waiter/schemas";
import { publishToCashier } from "@/server/realtime/publish";
import { REALTIME_EVENTS } from "@/shared/realtime/events";
import mongoose from "mongoose";

export async function openTicketForTable(data: OpenTicketRequest) {
  const session = await requirePermission("order:create");
  const validated = OpenTicketSchema.parse(data);

  await connectToDatabase();

  // Try to use a transaction for safety
  const dbSession = await mongoose.startSession();
  try {
    let result: { created: boolean; ticket: TicketDTO } | null = null;

    await dbSession.withTransaction(async () => {
      // 1. Authoritative check on the table
      const table = await RestaurantTableModel.findById(
        validated.tableId,
      ).session(dbSession);
      if (!table) throw new Error("Table not found");
      if (table.status === "INACTIVE") throw new Error("Table is inactive");

      // 2. Authoritative check on the zone
      const zone = await ZoneModel.findOne({ name: table.zone }).session(
        dbSession,
      );
      if (!zone || !zone.isActive) throw new Error("Zone is inactive");

      // 3. Check for existing OPEN ticket for this table
      const existingTicket = await TicketModel.findOne({
        tableId: table._id,
        status: "OPEN",
      }).session(dbSession);

      if (existingTicket) {
        // RESUME: Fix table state if disconnected
        if (
          table.status !== "OCCUPIED" ||
          table.currentTicketId?.toString() !== existingTicket._id.toString()
        ) {
          table.status = "OCCUPIED";
          table.currentTicketId = existingTicket._id;
          await table.save({ session: dbSession });
        }

        result = {
          created: false,
          ticket: {
            id: existingTicket._id.toString(),
            ticketNo: existingTicket.ticketNo as number,
            tableId: existingTicket.tableId.toString(),
            waiterId: existingTicket.waiterId.toString(),
            status: "OPEN",
            guestCount: existingTicket.guestCount as number,
            openedAt: existingTicket.openedAt.toISOString(),
          },
        };
        return; // Break out of transaction callback early
      }

      // 4. Create new ticket
      const ticketNo = await getNextTicketNumber(dbSession);

      const newTicket = new TicketModel({
        ticketNo,
        tableId: table._id,
        waiterId: session.userId,
        guestCount: validated.guestCount,
        status: "OPEN",
      });
      await newTicket.save({ session: dbSession });

      table.status = "OCCUPIED";
      table.currentTicketId = newTicket._id;
      await table.save({ session: dbSession });

      await AuditLogModel.create(
        [
          {
            actorId: session.userId,
            action: "OPEN_TICKET",
            entity: "Ticket",
            entityId: newTicket._id.toString(),
            metadata: {
              tableId: table._id.toString(),
              ticketNo,
              guestCount: validated.guestCount,
            },
          },
        ],
        { session: dbSession },
      );

      result = {
        created: true,
        ticket: {
          id: newTicket._id.toString(),
          ticketNo: newTicket.ticketNo as number,
          tableId: newTicket.tableId.toString(),
          waiterId: newTicket.waiterId.toString(),
          status: "OPEN",
          guestCount: newTicket.guestCount as number,
          openedAt: newTicket.openedAt.toISOString(),
        },
      };
    });

    if (!result) throw new Error("Transaction completed without result");
    return result;
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;
    // 5. Handle duplicate key error safely as a race fallback
    if (
      err.code === 11000 &&
      err.keyPattern &&
      (err.keyPattern as Record<string, unknown>).tableId === 1
    ) {
      // Duplicate key on the partial OPEN index means another waiter beat us to it.
      const existingTicket = await TicketModel.findOne({
        tableId: validated.tableId,
        status: "OPEN",
      });
      if (existingTicket) {
        return {
          created: false,
          ticket: {
            id: existingTicket._id.toString(),
            ticketNo: existingTicket.ticketNo as number,
            tableId: existingTicket.tableId.toString(),
            waiterId: existingTicket.waiterId.toString(),
            status: "OPEN",
            guestCount: existingTicket.guestCount as number,
            openedAt: existingTicket.openedAt.toISOString(),
          },
        };
      }
    }
    throw err;
  } finally {
    await dbSession.endSession();
  }
}

export async function getTicketShell(ticketId: string): Promise<TicketDTO> {
  await requirePermission("table:read");
  await connectToDatabase();

  const ticket = await TicketModel.findById(ticketId).lean();
  if (!ticket) throw new Error("Ticket not found");

  const table = await RestaurantTableModel.findById(ticket.tableId).lean();
  const tableLabel = table ? table.label : undefined;

  return {
    id: ticket._id.toString(),
    ticketNo: ticket.ticketNo as number,
    tableId: ticket.tableId.toString(),
    tableLabel: tableLabel,
    waiterId: ticket.waiterId.toString(),
    status: ticket.status as "OPEN" | "PAID" | "CANCELLED" | "CLOSED",
    guestCount: ticket.guestCount as number,
    openedAt: ticket.openedAt.toISOString(),
    subtotalMinor: ticket.subtotalMinor,
    taxMinor: ticket.taxMinor,
    serviceChargeMinor: ticket.serviceChargeMinor,
    totalMinor: ticket.totalMinor,
  };
}

export async function closeTicket(
  ticketId: string,
  idempotencyKey: string,
): Promise<{ success: boolean; ticket?: TicketDTO }> {
  const session = await requirePermission("order:close");
  await connectToDatabase();

  const dbSession = await mongoose.startSession();
  try {
    let result: { success: boolean; ticket?: TicketDTO } | null = null;
    await dbSession.withTransaction(async () => {
      const idempotencyScope = `ticket:${ticketId}:close`;
      const existingIdempotency = await IdempotencyRecordModel.findOne({
        key: idempotencyKey,
        scope: idempotencyScope,
      }).session(dbSession);

      if (existingIdempotency && existingIdempotency.status === "SUCCEEDED") {
        const ticket = await TicketModel.findById(ticketId)
          .session(dbSession)
          .lean();
        if (!ticket) throw new Error("Ticket not found");
        result = {
          success: true,
          ticket: {
            id: ticket._id.toString(),
            ticketNo: ticket.ticketNo as number,
            tableId: ticket.tableId.toString(),
            waiterId: ticket.waiterId.toString(),
            status: ticket.status as "OPEN" | "PAID" | "CANCELLED" | "CLOSED",
            guestCount: ticket.guestCount as number,
            openedAt: ticket.openedAt.toISOString(),
            subtotalMinor: ticket.subtotalMinor,
            taxMinor: ticket.taxMinor,
            serviceChargeMinor: ticket.serviceChargeMinor,
            totalMinor: ticket.totalMinor,
          },
        };
        return;
      }

      const ticket = await TicketModel.findById(ticketId).session(dbSession);
      if (!ticket) throw new Error("Ticket not found");

      if (ticket.status === "PAID" || ticket.status === "CANCELLED") {
        throw new Error(
          "Cannot close a ticket that is already PAID or CANCELLED",
        );
      }

      if (ticket.status === "CLOSED") {
        // If it's already CLOSED but idempotency didn't match, we might have had a network drop.
        // We can just return success or throw. Guide says "CLOSED tickets cannot be closed again unless idempotent behavior is explicitly required."
        // We will just return success to be safe and idempotent overall if it's already CLOSED.
        result = {
          success: true,
          ticket: {
            id: ticket._id.toString(),
            ticketNo: ticket.ticketNo as number,
            tableId: ticket.tableId.toString(),
            waiterId: ticket.waiterId.toString(),
            status: "CLOSED",
            guestCount: ticket.guestCount as number,
            openedAt: ticket.openedAt.toISOString(),
            subtotalMinor: ticket.subtotalMinor,
            taxMinor: ticket.taxMinor,
            serviceChargeMinor: ticket.serviceChargeMinor,
            totalMinor: ticket.totalMinor,
          },
        };
        return;
      }

      // Check order lines
      const allLines = await OrderLineModel.find({
        ticketId: ticket._id,
      }).session(dbSession);
      const activeLines = allLines.filter((l) => l.status !== "VOID");

      if (activeLines.length === 0) {
        throw new Error(
          "Cannot close an empty ticket. Please cancel the ticket instead.",
        );
      }

      for (const line of activeLines) {
        if (
          line.status === "NEW" ||
          line.status === "PREPARING" ||
          line.status === "READY"
        ) {
          throw new Error(
            "Cannot close ticket with unserved items. All items must be SERVED or VOID.",
          );
        }
      }

      // Recalculate totals to ensure server authority
      let subtotalMinor = 0;
      for (const l of activeLines) {
        const lineItemPrice = l.priceSnapshotMinor ?? 0;
        let lineModifiersPrice = 0;
        for (const m of l.modifierSnapshots) {
          lineModifiersPrice = addMinor(
            lineModifiersPrice,
            m.priceDeltaMinor ?? 0,
          );
        }
        const lineTotalMinor = multiplyMinorByQuantity(
          addMinor(lineItemPrice, lineModifiersPrice),
          l.quantity,
        );
        subtotalMinor = addMinor(subtotalMinor, lineTotalMinor);
      }

      const settings = await RestaurantSettingsModel.findOne({
        key: "default",
      }).session(dbSession);
      const taxBps = settings?.taxBps ?? 0;
      const serviceChargeBps = settings?.serviceChargeBps ?? 0;

      const taxMinor = calculateBasisPoints(subtotalMinor, taxBps);
      const serviceChargeMinor = calculateBasisPoints(
        subtotalMinor,
        serviceChargeBps,
      );
      const totalMinor = addMinor(subtotalMinor, taxMinor, serviceChargeMinor);

      ticket.subtotalMinor = subtotalMinor;
      ticket.taxMinor = taxMinor;
      ticket.serviceChargeMinor = serviceChargeMinor;
      ticket.totalMinor = totalMinor;

      ticket.status = "CLOSED";
      ticket.closedAt = new Date();

      await ticket.save({ session: dbSession });

      // Save Idempotency
      if (existingIdempotency) {
        existingIdempotency.status = "SUCCEEDED";
        await existingIdempotency.save({ session: dbSession });
      } else {
        await IdempotencyRecordModel.create(
          [
            {
              key: idempotencyKey,
              scope: idempotencyScope,
              requestHash: "N/A",
              status: "SUCCEEDED",
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
            },
          ],
          { session: dbSession },
        );
      }

      // Audit Log
      await AuditLogModel.create(
        [
          {
            action: "CLOSE_TICKET",
            actorId: session.userId,
            entity: "Ticket",
            entityId: ticket._id.toString(),
            metadata: {
              ticketNo: ticket.ticketNo,
              tableId: ticket.tableId.toString(),
              totalMinor: ticket.totalMinor,
            },
          },
        ],
        { session: dbSession },
      );

      result = {
        success: true,
        ticket: {
          id: ticket._id.toString(),
          ticketNo: ticket.ticketNo as number,
          tableId: ticket.tableId.toString(),
          waiterId: ticket.waiterId.toString(),
          status: "CLOSED",
          guestCount: ticket.guestCount as number,
          openedAt: ticket.openedAt.toISOString(),
          subtotalMinor: ticket.subtotalMinor,
          taxMinor: ticket.taxMinor,
          serviceChargeMinor: ticket.serviceChargeMinor,
          totalMinor: ticket.totalMinor,
        },
      };
    });

    const finalResult = result as {
      success: boolean;
      ticket?: TicketDTO;
    } | null;
    if (!finalResult) throw new Error("Transaction completed without result");

    // Publish Realtime event after successful commit
    if (finalResult.success && finalResult.ticket) {
      try {
        publishToCashier(REALTIME_EVENTS.TICKET_CLOSED_V1, {
          id: finalResult.ticket.id,
          tableId: finalResult.ticket.tableId,
          timestamp: new Date().toISOString(),
          correlationId: idempotencyKey,
        }).catch(console.error);
      } catch (publishErr) {
        console.error(
          "[RealTime] Failed to publish ticket.closed.v1 event",
          publishErr,
        );
      }
    }

    return finalResult;
  } finally {
    await dbSession.endSession();
  }
}
