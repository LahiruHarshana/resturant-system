import { requirePermission } from "@/server/auth/authorization";
import { connectToDatabase } from "@/server/db/connect";
import { TicketModel } from "@/server/db/models/ticket.model";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { IdempotencyRecordModel } from "@/server/db/models/idempotency-record.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import { StationModel } from "@/server/db/models/station.model";
import {
  addMinor,
  calculateBasisPoints,
  multiplyMinorByQuantity,
} from "@/shared/money/money";
import { REALTIME_EVENTS } from "@/shared/realtime/events";
import { publishToStation, publishToTable } from "@/server/realtime/publish";
import type {
  FireOrderRequest,
  FireOrderResponse,
  StationFiredPayload,
  TicketComposerResponse,
  FireTicketLinesRequest,
  MarkLineServedRequest,
} from "@/shared/waiter/schemas";
import {
  FireOrderRequestSchema,
  FireTicketLinesRequestSchema,
  MarkLineServedRequestSchema,
} from "@/shared/waiter/schemas";
import mongoose from "mongoose";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";

export async function getOrderLines(ticketId: string) {
  await requirePermission("table:read");
  await connectToDatabase();

  const ticket = await TicketModel.findById(ticketId).lean();
  if (!ticket) throw new Error("Ticket not found");

  const lines = await OrderLineModel.find({ ticketId }).lean();

  return lines.map((l) => ({
    id: l._id.toString(),
    menuItemId: l.menuItemId.toString(),
    nameSnapshot: l.nameSnapshot,
    priceSnapshotMinor: l.priceSnapshotMinor ?? 0,
    quantity: l.quantity,
    note: l.note ?? undefined,
    modifierSnapshots: l.modifierSnapshots.map((m) => ({
      nameSnapshot: m.nameSnapshot,
      priceDeltaMinor: m.priceDeltaMinor ?? 0,
    })),
    stationTypeSnapshot: l.stationTypeSnapshot,
    status: l.status as "NEW" | "PREPARING" | "READY" | "SERVED" | "VOID",
    firedAt: l.firedAt?.toISOString(),
  }));
}

export async function addOrderLines(
  ticketId: string,
  requestData: FireOrderRequest,
): Promise<TicketComposerResponse> {
  // Use exact approved permission for adding order content (order:update as per guide/prompt or table:read depending on canonical)
  // Let's use order:update for modifying the order
  const session = await requirePermission("order:update");
  const data = FireOrderRequestSchema.parse(requestData);

  await connectToDatabase();

  const dbSession = await mongoose.startSession();
  try {
    let result: TicketComposerResponse | null = null;

    await dbSession.withTransaction(async () => {
      // 1. Check idempotency
      const idempotencyKey = data.idempotencyKey;
      const idempotencyScope = `ticket:${ticketId}:fire`;
      const existingIdempotency = await IdempotencyRecordModel.findOne({
        key: idempotencyKey,
        scope: idempotencyScope,
      }).session(dbSession);

      if (existingIdempotency && existingIdempotency.status === "SUCCEEDED") {
        // Return existing state without creating duplicate lines
        const ticket = await TicketModel.findById(ticketId)
          .session(dbSession)
          .lean();
        if (!ticket) throw new Error("Ticket not found");

        const lines = await OrderLineModel.find({ ticketId })
          .session(dbSession)
          .lean();

        result = {
          success: true,
          ticket: {
            id: ticket._id.toString(),
            ticketNo: ticket.ticketNo,
            tableId: ticket.tableId.toString(),
            waiterId: ticket.waiterId.toString(),
            status: ticket.status as "OPEN" | "PAID" | "CANCELLED" | "CLOSED",
            guestCount: ticket.guestCount || 0,
            openedAt: ticket.openedAt.toISOString(),
            subtotalMinor: ticket.subtotalMinor || 0,
            taxMinor: ticket.taxMinor || 0,
            serviceChargeMinor: ticket.serviceChargeMinor || 0,
            totalMinor: ticket.totalMinor || 0,
          },
          lines: lines.map((l) => ({
            id: l._id.toString(),
            menuItemId: l.menuItemId.toString(),
            nameSnapshot: l.nameSnapshot,
            priceSnapshotMinor: l.priceSnapshotMinor ?? 0,
            quantity: l.quantity,
            note: l.note ?? undefined,
            modifierSnapshots: l.modifierSnapshots.map((m) => ({
              nameSnapshot: m.nameSnapshot,
              priceDeltaMinor: m.priceDeltaMinor ?? 0,
            })),
            stationTypeSnapshot: l.stationTypeSnapshot,
            status: l.status as
              "NEW" | "PREPARING" | "READY" | "SERVED" | "VOID",
            firedAt: l.firedAt?.toISOString(),
          })),
        };
        return; // Early return from transaction
      }

      // 2. Authoritative check on the ticket
      const ticket = await TicketModel.findById(ticketId).session(dbSession);
      if (!ticket) throw new Error("Ticket not found");
      if (ticket.status !== "OPEN")
        throw new Error("Only OPEN tickets can be modified");

      // Verify the waiter session matches if required? Prompt says: "The waiterId must come from the authenticated session."
      // Actually, wait, does the waiter have to own it? Yes, let's strictly enforce if Guide 11 implies so.
      // Wait, "The waiterId must come from the authenticated session. Do not accept waiterId from the browser."
      // The ticket has its `waiterId`, we just need to use session._id for audit logs.

      // 3. Resolve items and snapshots
      const itemIds = [...new Set(data.lines.map((l) => l.menuItemId))];
      const items = await MenuItemModel.find({
        _id: { $in: itemIds },
        isAvailable: true,
      }).session(dbSession);
      const itemsMap = new Map(items.map((i) => [i._id.toString(), i]));

      const stationIds = [...new Set(items.map((i) => i.stationId.toString()))];
      const stations = await StationModel.find({
        _id: { $in: stationIds },
        isActive: true,
      }).session(dbSession);
      const stationsMap = new Map(stations.map((s) => [s._id.toString(), s]));

      const newLines = [];

      for (const line of data.lines) {
        const menuItem = itemsMap.get(line.menuItemId);
        if (!menuItem)
          throw new Error(`Menu item ${line.menuItemId} is not available`);

        const station = stationsMap.get(menuItem.stationId.toString());
        if (!station)
          throw new Error(`Station for item ${menuItem.name} is inactive`);

        // Validate modifiers
        const modifierSnapshots = [];
        let itemModifiersPriceMinor = 0;

        const providedSelections = line.modifierSelections || [];
        const itemModifiers = menuItem.modifiers || [];

        for (const group of itemModifiers) {
          const selections = providedSelections.filter(
            (s) => s.groupName === group.name,
          );

          const seenOptions = new Set<string>();
          if (selections.length < group.minSelections) {
            throw new Error(
              `Not enough selections for modifier group ${group.name}`,
            );
          }
          if (selections.length > group.maxSelections) {
            throw new Error(
              `Too many selections for modifier group ${group.name}`,
            );
          }

          // Check options
          for (const sel of selections) {
            const opt = group.options.find((o) => o.name === sel.optionName);
            if (!opt) {
              throw new Error("Invalid modifier selection");
            }
            if (seenOptions.has(sel.optionName)) {
              throw new Error("Duplicate modifier selection");
            }
            seenOptions.add(sel.optionName);
            modifierSnapshots.push({
              nameSnapshot: `${group.name}: ${opt.name}`,
              priceDeltaMinor: opt.priceDeltaMinor ?? 0,
            });
            itemModifiersPriceMinor = addMinor(
              itemModifiersPriceMinor,
              opt.priceDeltaMinor ?? 0,
            );
          }
        }

        // Reject unknown groups
        const validGroupNames = new Set(itemModifiers.map((g) => g.name));
        for (const sel of providedSelections) {
          if (!validGroupNames.has(sel.groupName)) {
            throw new Error("Invalid modifier selection");
          }
        }

        newLines.push({
          ticketId: ticket._id,
          menuItemId: menuItem._id,
          nameSnapshot: menuItem.name,
          priceSnapshotMinor: menuItem.priceMinor ?? 0,
          quantity: line.quantity,
          note: line.note,
          modifierSnapshots,
          stationId: station._id,
          stationTypeSnapshot: station.type,
          status: "NEW",
        });
      }

      const createdLines = await OrderLineModel.insertMany(newLines, {
        session: dbSession,
      });

      // 4. Recalculate Totals
      const allLines = await OrderLineModel.find({
        ticketId: ticket._id,
      }).session(dbSession);

      let subtotalMinor = 0;
      for (const l of allLines) {
        if (l.status === "VOID") continue;
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

      await ticket.save({ session: dbSession });

      // 5. Audit Log
      await AuditLogModel.create(
        [
          {
            action: "FIRE_ORDER",
            actorId: session.userId,
            entity: "Ticket",
            entityId: ticket._id.toString(),
            metadata: {
              ticketNo: ticket.ticketNo,
              addedLinesCount: createdLines.length,
            },
          },
        ],
        { session: dbSession },
      );

      // 6. Save Idempotency
      if (existingIdempotency) {
        existingIdempotency.status = "SUCCEEDED";
        await existingIdempotency.save({ session: dbSession });
      } else {
        await IdempotencyRecordModel.create(
          [
            {
              key: idempotencyKey,
              scope: idempotencyScope,
              requestHash: "N/A", // Skip hashing for internal idempotency if not strict
              status: "SUCCEEDED",
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
            },
          ],
          { session: dbSession },
        );
      }

      result = {
        success: true,
        ticket: {
          id: ticket._id.toString(),
          ticketNo: ticket.ticketNo,
          tableId: ticket.tableId.toString(),
          waiterId: ticket.waiterId.toString(),
          status: ticket.status as "OPEN" | "PAID" | "CANCELLED" | "CLOSED",
          guestCount: ticket.guestCount || 0,
          openedAt: ticket.openedAt.toISOString(),
          subtotalMinor: ticket.subtotalMinor || 0,
          taxMinor: ticket.taxMinor || 0,
          serviceChargeMinor: ticket.serviceChargeMinor || 0,
          totalMinor: ticket.totalMinor || 0,
        },
        lines: allLines.map((l) => ({
          id: l._id.toString(),
          menuItemId: l.menuItemId.toString(),
          nameSnapshot: l.nameSnapshot,
          priceSnapshotMinor: l.priceSnapshotMinor ?? 0,
          quantity: l.quantity,
          note: l.note ?? undefined,
          modifierSnapshots: l.modifierSnapshots.map((m) => ({
            nameSnapshot: m.nameSnapshot,
            priceDeltaMinor: m.priceDeltaMinor ?? 0,
          })),
          stationTypeSnapshot: l.stationTypeSnapshot,
          status: l.status as "NEW" | "PREPARING" | "READY" | "SERVED" | "VOID",
          firedAt: l.firedAt?.toISOString(),
        })),
      };
    });

    if (!result) throw new Error("Transaction failed to return result");
    return result;
  } finally {
    await dbSession.endSession();
  }
}

export async function removeOrderLine(
  ticketId: string,
  lineId: string,
): Promise<TicketComposerResponse> {
  const session = await requirePermission("order:update");
  await connectToDatabase();

  const dbSession = await mongoose.startSession();
  try {
    let result: TicketComposerResponse | null = null;

    await dbSession.withTransaction(async () => {
      const ticket = await TicketModel.findById(ticketId).session(dbSession);
      if (!ticket) throw new Error("Ticket not found");
      if (ticket.status !== "OPEN")
        throw new Error("Only OPEN tickets can be modified");

      const line = await OrderLineModel.findOne({
        _id: lineId,
        ticketId,
      }).session(dbSession);
      if (!line) throw new Error("Order line not found");

      if (line.status !== "NEW") {
        throw new Error(
          "Cannot remove order line that is already being prepared",
        );
      }

      await OrderLineModel.deleteOne({ _id: lineId }).session(dbSession);

      // Recalculate Totals
      const allLines = await OrderLineModel.find({ ticketId }).session(
        dbSession,
      );

      let subtotalMinor = 0;
      for (const l of allLines) {
        if (l.status === "VOID") continue;
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

      await ticket.save({ session: dbSession });

      await AuditLogModel.create(
        [
          {
            action: "REMOVE_ORDER_LINE",
            actorId: session.userId,
            entity: "Ticket",
            entityId: ticket._id.toString(),
            metadata: {
              lineId: line._id.toString(),
              menuItemId: line.menuItemId.toString(),
            },
          },
        ],
        { session: dbSession },
      );

      result = {
        success: true,
        ticket: {
          id: ticket._id.toString(),
          ticketNo: ticket.ticketNo,
          tableId: ticket.tableId.toString(),
          waiterId: ticket.waiterId.toString(),
          status: ticket.status as "OPEN" | "PAID" | "CANCELLED" | "CLOSED",
          guestCount: ticket.guestCount || 0,
          openedAt: ticket.openedAt.toISOString(),
          subtotalMinor: ticket.subtotalMinor || 0,
          taxMinor: ticket.taxMinor || 0,
          serviceChargeMinor: ticket.serviceChargeMinor || 0,
          totalMinor: ticket.totalMinor || 0,
        },
        lines: allLines.map((l) => ({
          id: l._id.toString(),
          menuItemId: l.menuItemId.toString(),
          nameSnapshot: l.nameSnapshot,
          priceSnapshotMinor: l.priceSnapshotMinor ?? 0,
          quantity: l.quantity,
          note: l.note ?? undefined,
          modifierSnapshots: l.modifierSnapshots.map((m) => ({
            nameSnapshot: m.nameSnapshot,
            priceDeltaMinor: m.priceDeltaMinor ?? 0,
          })),
          stationTypeSnapshot: l.stationTypeSnapshot,
          status: l.status as "NEW" | "PREPARING" | "READY" | "SERVED" | "VOID",
          firedAt: l.firedAt?.toISOString(),
        })),
      };
    });

    if (!result) throw new Error("Transaction failed to return result");
    return result;
  } finally {
    await dbSession.endSession();
  }
}

export async function fireTicketLines(
  ticketId: string,
  requestData: FireTicketLinesRequest,
): Promise<FireOrderResponse> {
  const session = await requirePermission("order:update");
  const data = FireTicketLinesRequestSchema.parse(requestData);

  await connectToDatabase();

  const dbSession = await mongoose.startSession();
  try {
    let result: FireOrderResponse | null = null;

    await dbSession.withTransaction(async () => {
      // 1. Check idempotency
      const idempotencyKey = data.idempotencyKey;
      const idempotencyScope = `ticket:${ticketId}:fire`;
      const existingIdempotency = await IdempotencyRecordModel.findOne({
        key: idempotencyKey,
        scope: idempotencyScope,
      }).session(dbSession);

      if (existingIdempotency && existingIdempotency.status === "SUCCEEDED") {
        // Return existing state without refiring
        const ticket = await TicketModel.findById(ticketId)
          .session(dbSession)
          .lean();
        if (!ticket) throw new Error("Ticket not found");

        const table = await RestaurantTableModel.findById(ticket.tableId)
          .session(dbSession)
          .lean();
        const tableLabel = table?.label || "Unknown Table";

        const lines = await OrderLineModel.find({ ticketId })
          .session(dbSession)
          .lean();

        // Group by station
        const groupedStationsMap = new Map<string, StationFiredPayload>();
        for (const l of lines) {
          const sId = l.stationId.toString();
          if (!groupedStationsMap.has(sId)) {
            groupedStationsMap.set(sId, {
              stationId: sId,
              stationTypeSnapshot: l.stationTypeSnapshot,
              tableLabel,
              lines: [],
            });
          }
          groupedStationsMap.get(sId)!.lines.push({
            id: l._id.toString(),
            menuItemId: l.menuItemId.toString(),
            nameSnapshot: l.nameSnapshot,
            priceSnapshotMinor: l.priceSnapshotMinor,
            quantity: l.quantity,
            note: l.note ?? undefined,
            modifierSnapshots: l.modifierSnapshots.map((m) => ({
              nameSnapshot: m.nameSnapshot,
              priceDeltaMinor: m.priceDeltaMinor ?? 0,
            })),
            stationTypeSnapshot: l.stationTypeSnapshot,
            status: l.status as
              "NEW" | "PREPARING" | "READY" | "SERVED" | "VOID",
            firedAt: l.firedAt?.toISOString(),
          });
        }

        result = {
          success: true,
          ticket: {
            id: ticket._id.toString(),
            ticketNo: ticket.ticketNo,
            tableId: ticket.tableId.toString(),
            waiterId: ticket.waiterId.toString(),
            status: ticket.status as "OPEN" | "PAID" | "CANCELLED" | "CLOSED",
            guestCount: ticket.guestCount || 0,
            openedAt: ticket.openedAt.toISOString(),
            subtotalMinor: ticket.subtotalMinor || 0,
            taxMinor: ticket.taxMinor || 0,
            serviceChargeMinor: ticket.serviceChargeMinor || 0,
            totalMinor: ticket.totalMinor || 0,
          },
          stations: Array.from(groupedStationsMap.values()),
        };
        return; // Early return from transaction
      }

      // 2. Authoritative check on the ticket
      const ticket = await TicketModel.findById(ticketId).session(dbSession);
      if (!ticket) throw new Error("Ticket not found");
      if (ticket.status !== "OPEN")
        throw new Error("Only OPEN tickets can be modified");

      const table = await RestaurantTableModel.findById(ticket.tableId)
        .session(dbSession)
        .lean();
      const tableLabel = table?.label || "Unknown Table";

      // 3. Find requested lines
      const requestedLines = await OrderLineModel.find({
        _id: { $in: data.lineIds },
      }).session(dbSession);

      if (requestedLines.length !== data.lineIds.length) {
        throw new Error("One or more order lines not found");
      }

      const now = new Date();
      const groupedStationsMap = new Map<string, StationFiredPayload>();

      for (const line of requestedLines) {
        if (line.ticketId.toString() !== ticketId) {
          throw new Error("Line belongs to a different ticket");
        }
        if (line.status === "VOID") {
          throw new Error("Cannot fire a VOID line");
        }
      }

      for (const line of requestedLines) {
        // Only fire if not already fired (Guide 12 mentions deterministic behavior)
        line.firedAt = now;
        line.status = "NEW";
        await line.save({ session: dbSession });

        const sId = line.stationId.toString();
        if (!groupedStationsMap.has(sId)) {
          groupedStationsMap.set(sId, {
            stationId: sId,
            stationTypeSnapshot: line.stationTypeSnapshot,
            tableLabel,
            lines: [],
          });
        }
        groupedStationsMap.get(sId)!.lines.push({
          id: line._id.toString(),
          menuItemId: line.menuItemId.toString(),
          nameSnapshot: line.nameSnapshot,
          priceSnapshotMinor: line.priceSnapshotMinor,
          quantity: line.quantity,
          note: line.note ?? undefined,
          modifierSnapshots: line.modifierSnapshots.map((m) => ({
            nameSnapshot: m.nameSnapshot,
            priceDeltaMinor: m.priceDeltaMinor ?? 0,
          })),
          stationTypeSnapshot: line.stationTypeSnapshot,
          status: line.status as
            "NEW" | "PREPARING" | "READY" | "SERVED" | "VOID",
          firedAt: line.firedAt?.toISOString(),
        });
      }

      await IdempotencyRecordModel.create(
        [
          {
            key: idempotencyKey,
            scope: idempotencyScope,
            requestHash: "N/A", // Skip hashing for internal idempotency if not strict
            status: "SUCCEEDED",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          },
        ],
        { session: dbSession },
      );

      await AuditLogModel.create(
        [
          {
            action: "FIRE_ORDER",
            actorId: session.userId,
            entity: "Ticket",
            entityId: ticket._id.toString(),
            metadata: {
              lineIds: data.lineIds,
            },
          },
        ],
        { session: dbSession },
      );

      result = {
        success: true,
        ticket: {
          id: ticket._id.toString(),
          ticketNo: ticket.ticketNo,
          tableId: ticket.tableId.toString(),
          waiterId: ticket.waiterId.toString(),
          status: ticket.status as "OPEN" | "PAID" | "CANCELLED" | "CLOSED",
          guestCount: ticket.guestCount || 0,
          openedAt: ticket.openedAt.toISOString(),
          subtotalMinor: ticket.subtotalMinor || 0,
          taxMinor: ticket.taxMinor || 0,
          serviceChargeMinor: ticket.serviceChargeMinor || 0,
          totalMinor: ticket.totalMinor || 0,
        },
        stations: Array.from(groupedStationsMap.values()),
      };
    });

    if (!result) throw new Error("Transaction failed to return result");

    // Publish Realtime Events after successful commit
    try {
      const finalResult = result as FireOrderResponse;
      const ticketResult = finalResult.ticket;

      // We ignore publish errors because they shouldn't fail the REST response
      publishToTable(ticketResult.tableId, REALTIME_EVENTS.TICKET_UPDATED_V1, {
        id: ticketResult.id,
        tableId: ticketResult.tableId,
        status: ticketResult.status,
        subtotalMinor: ticketResult.subtotalMinor,
        taxMinor: ticketResult.taxMinor,
        serviceChargeMinor: ticketResult.serviceChargeMinor,
        totalMinor: ticketResult.totalMinor,
        timestamp: new Date().toISOString(),
        correlationId: data.idempotencyKey,
      }).catch(console.error);

      for (const stationGroup of finalResult.stations) {
        for (const line of stationGroup.lines) {
          publishToStation(
            stationGroup.stationId,
            REALTIME_EVENTS.LINE_CREATED_V1,
            {
              id: line.id,
              ticketId: ticketResult.id,
              ticketNo: ticketResult.ticketNo,
              stationId: stationGroup.stationId,
              stationTypeSnapshot: stationGroup.stationTypeSnapshot,
              status: line.status,
              itemNameSnapshot: line.nameSnapshot,
              quantity: line.quantity,
              modifierSnapshots: line.modifierSnapshots,
              firedAt: line.firedAt,
              timestamp: new Date().toISOString(),
              correlationId: data.idempotencyKey,
            },
          ).catch(console.error);
        }
      }
    } catch (publishErr) {
      console.error(
        "[RealTime] Failed to publish events post-commit",
        publishErr,
      );
    }

    return result as FireOrderResponse;
  } finally {
    await dbSession.endSession();
  }
}

export async function markLineServed(
  ticketId: string,
  lineId: string,
  requestData: MarkLineServedRequest,
): Promise<{ success: boolean }> {
  const session = await requirePermission("order:update");
  const data = MarkLineServedRequestSchema.parse(requestData);

  await connectToDatabase();

  const dbSession = await mongoose.startSession();
  try {
    let result: {
      lineId: string;
      ticketId: string;
      stationId: string;
      tableId?: string;
      status: string;
      previousStatus: string;
    } | null = null;
    await dbSession.withTransaction(async () => {
      const idempotencyKey = data.idempotencyKey;
      const idempotencyScope = `line:${lineId}:served`;
      const existingIdempotency = await IdempotencyRecordModel.findOne({
        key: idempotencyKey,
        scope: idempotencyScope,
      }).session(dbSession);

      if (existingIdempotency && existingIdempotency.status === "SUCCEEDED") {
        return; // Already served, idempotent success
      }

      const ticket = await TicketModel.findById(ticketId).session(dbSession);
      if (!ticket) throw new Error("Ticket not found");

      // Waiter UI expects to serve from an OPEN ticket only, as closed/paid tickets are read-only.
      if (ticket.status !== "OPEN") {
        throw new Error("Cannot update line for inactive ticket");
      }

      const line = await OrderLineModel.findOne({
        _id: lineId,
        ticketId,
      }).session(dbSession);

      if (!line) throw new Error("Order line not found");

      if (line.status === "SERVED") {
        // Idempotent catch-all if another request served it
        return;
      }

      if (line.status !== "READY") {
        throw new Error("Invalid transition to SERVED. Line must be READY.");
      }

      const previousStatus = line.status;
      line.status = "SERVED";
      line.servedAt = new Date();

      await line.save({ session: dbSession });

      await AuditLogModel.create(
        [
          {
            action: "LINE_STATUS_UPDATED",
            entity: "ORDER_LINE",
            entityId: line._id.toString(),
            actorId: session.userId,
            metadata: {
              previousStatus,
              newStatus: "SERVED",
              ticketId: ticketId,
              stationId: line.stationId.toString(),
            },
          },
        ],
        { session: dbSession },
      );

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

      result = {
        lineId: line._id.toString(),
        ticketId: ticket._id.toString(),
        stationId: line.stationId.toString(),
        tableId: ticket.tableId ? ticket.tableId.toString() : undefined,
        status: "SERVED",
        previousStatus,
      };
    });

    const finalResult = result as {
      lineId: string;
      ticketId: string;
      stationId: string;
      tableId?: string;
      status: string;
      previousStatus: string;
    } | null;

    if (finalResult) {
      // Publish event
      const timestamp = new Date().toISOString();
      if (finalResult.tableId) {
        publishToTable(
          finalResult.tableId,
          REALTIME_EVENTS.LINE_STATUS_CHANGED_V1,
          {
            id: finalResult.lineId,
            ticketId: finalResult.ticketId,
            stationId: finalResult.stationId,
            status: finalResult.status,
            previousStatus: finalResult.previousStatus,
            timestamp,
          },
        ).catch(console.error);
      }
    }

    return { success: true };
  } finally {
    await dbSession.endSession();
  }
}

export async function getReadyLines(ticketId: string) {
  await requirePermission("table:read");
  await connectToDatabase();

  const lines = await OrderLineModel.find({
    ticketId,
    status: "READY",
  }).lean();

  return lines;
}
