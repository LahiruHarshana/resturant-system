import { TicketModel } from "@/server/db/models/ticket.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { PaymentModel } from "@/server/db/models/payment.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { IdempotencyRecordModel } from "@/server/db/models/idempotency-record.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import { getRealTimeProvider } from "@/server/realtime/index";
import { getCashierChannel, getTableChannel } from "@/server/realtime/channels";
import {
  addMinor,
  subtractMinor,
  calculateBasisPoints,
  assertMoneyMinor,
} from "@/shared/money/money";
import mongoose from "mongoose";

export async function calculateBill(ticketId: string) {
  const ticket = await TicketModel.findById(ticketId).exec();
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  if (ticket.status !== "CLOSED") throw new Error("TICKET_NOT_CLOSED");

  const lines = await OrderLineModel.find({
    ticketId: ticket._id,
    status: "SERVED",
  }).exec();

  const settings = await RestaurantSettingsModel.findOne({
    key: "default",
  }).exec();
  if (!settings) throw new Error("SETTINGS_NOT_FOUND");

  let subtotalMinor = 0;
  const lineDetails = lines.map((line) => {
    const modifiersMinor = line.modifierSnapshots.reduce(
      (sum, m) => sum + m.priceDeltaMinor,
      0,
    );
    const lineTotalMinor =
      (line.priceSnapshotMinor + modifiersMinor) * line.quantity;
    subtotalMinor = addMinor(subtotalMinor, lineTotalMinor);
    return {
      id: line._id.toString(),
      nameSnapshot: line.nameSnapshot,
      quantity: line.quantity,
      priceSnapshotMinor: line.priceSnapshotMinor,
      modifiersMinor,
      totalMinor: lineTotalMinor,
    };
  });

  // Cap discount at subtotal
  let discountMinor = ticket.discountMinor || 0;
  if (discountMinor > subtotalMinor) {
    discountMinor = subtotalMinor;
  }

  const taxableTotalMinor = subtractMinor(subtotalMinor, discountMinor);
  const taxMinor = calculateBasisPoints(taxableTotalMinor, settings.taxBps);
  const serviceChargeMinor = calculateBasisPoints(
    taxableTotalMinor,
    settings.serviceChargeBps,
  );

  const totalMinor = addMinor(taxableTotalMinor, taxMinor, serviceChargeMinor);

  // Update authoritative totals on the ticket
  ticket.subtotalMinor = subtotalMinor;
  ticket.discountMinor = discountMinor;
  ticket.taxMinor = taxMinor;
  ticket.serviceChargeMinor = serviceChargeMinor;
  ticket.totalMinor = totalMinor;

  await ticket.save();

  return {
    id: ticket._id.toString(),
    ticketNo: ticket.ticketNo,
    tableId: ticket.tableId.toString(),
    waiterId: ticket.waiterId.toString(),
    status: ticket.status,
    subtotalMinor: ticket.subtotalMinor,
    discountMinor: ticket.discountMinor,
    taxMinor: ticket.taxMinor,
    serviceChargeMinor: ticket.serviceChargeMinor,
    totalMinor: ticket.totalMinor,
    lines: lineDetails,
  };
}

export async function applyDiscount(
  ticketId: string,
  amountMinor: number,
  actorUserId: string,
  idempotencyKey: string,
): Promise<{ success: boolean } | null> {
  assertMoneyMinor(amountMinor, "amountMinor");

  const session = await mongoose.startSession();
  try {
    let result: { success: boolean } | null = null;
    await session.withTransaction(async () => {
      // Idempotency check
      const scope = `apply-discount:${ticketId}`;
      const existing = await IdempotencyRecordModel.findOne({
        key: idempotencyKey,
        scope,
      }).session(session);

      if (existing) {
        result = existing.resultMetadata;
        return;
      }

      const ticket = await TicketModel.findById(ticketId).session(session);
      if (!ticket) {
        const error = new Error("TICKET_NOT_FOUND");
        Object.assign(error, { status: 404 });
        throw error;
      }

      if (ticket.status !== "CLOSED") {
        const error = new Error("TICKET_NOT_CLOSED");
        Object.assign(error, { status: 409 });
        throw error;
      }

      const previousDiscount = ticket.discountMinor;
      ticket.discountMinor = amountMinor;
      await ticket.save({ session });

      // Create Idempotency record
      await IdempotencyRecordModel.create(
        [
          {
            key: idempotencyKey,
            scope,
            status: "SUCCEEDED",
            requestHash: "N/A",
            resultMetadata: { success: true },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          },
        ],
        { session },
      );

      // Audit
      await AuditLogModel.create(
        [
          {
            actorId: actorUserId,
            entity: "Ticket",
            entityId: ticket._id.toString(),
            action: "UPDATE",
            metadata: {
              details: `Applied discount: ${amountMinor} (was ${previousDiscount})`,
              previousDiscountMinor: previousDiscount,
              newDiscountMinor: amountMinor,
            },
          },
        ],
        { session },
      );

      result = { success: true };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export async function recordPayment({
  ticketId,
  method,
  tenderedMinor,
  idempotencyKey,
  actorUserId,
}: {
  ticketId: string;
  method: "CASH" | "CARD" | "OTHER";
  tenderedMinor: number;
  idempotencyKey: string;
  actorUserId: string;
}): Promise<{
  success: boolean;
  paymentId?: string;
  changeMinor?: number;
} | null> {
  assertMoneyMinor(tenderedMinor, "tenderedMinor");

  const scope = `record-payment:${ticketId}`;
  const preCheck = await IdempotencyRecordModel.findOne({
    key: idempotencyKey,
    scope,
  }).exec();

  if (preCheck) {
    return preCheck.resultMetadata as {
      success: boolean;
      paymentId?: string;
      changeMinor?: number;
    };
  }

  // Re-run calculateBill to ensure authoritative totals are fully saved before transaction
  const bill = await calculateBill(ticketId);
  const requiredTotalMinor = bill.totalMinor;

  if (method === "CASH" && tenderedMinor < requiredTotalMinor) {
    const error = new Error("INSUFFICIENT_TENDERED_AMOUNT");
    Object.assign(error, { status: 422 });
    throw error;
  }

  // For non-CASH, tendered equals total automatically in this system usually,
  // but let's enforce it exactly.
  if (method !== "CASH" && tenderedMinor !== requiredTotalMinor) {
    const error = new Error("EXACT_AMOUNT_REQUIRED_FOR_NON_CASH");
    Object.assign(error, { status: 422 });
    throw error;
  }

  const changeMinor = subtractMinor(tenderedMinor, requiredTotalMinor);

  const session = await mongoose.startSession();

  try {
    let result: {
      success: boolean;
      paymentId?: string;
      changeMinor?: number;
    } | null = null;
    await session.withTransaction(async () => {
      const scope = `record-payment:${ticketId}`;
      const existing = await IdempotencyRecordModel.findOne({
        key: idempotencyKey,
        scope,
      }).session(session);

      if (existing) {
        result = existing.resultMetadata;
        return;
      }

      const ticket = await TicketModel.findById(ticketId).session(session);
      if (!ticket) {
        const error = new Error("TICKET_NOT_FOUND");
        Object.assign(error, { status: 404 });
        throw error;
      }

      if (ticket.status !== "CLOSED") {
        const error = new Error("TICKET_NOT_CLOSED");
        Object.assign(error, { status: 409 });
        throw error;
      }

      // Record payment
      const [payment] = await PaymentModel.create(
        [
          {
            ticketId: ticket._id,
            cashierId: actorUserId,
            method,
            tenderedMinor,
            amountMinor: requiredTotalMinor,
            changeMinor,
            idempotencyKey,
          },
        ],
        { session },
      );

      // Update ticket
      ticket.status = "PAID";
      ticket.paidAt = new Date();
      await ticket.save({ session });

      // Update Table
      const table = await RestaurantTableModel.findById(ticket.tableId).session(
        session,
      );
      if (table) {
        table.status = "AVAILABLE";
        table.currentTicketId = undefined;
        await table.save({ session });
      }

      result = {
        success: true,
        paymentId: payment!._id.toString(),
        changeMinor,
      };

      await IdempotencyRecordModel.create(
        [
          {
            key: idempotencyKey,
            scope,
            status: "SUCCEEDED",
            requestHash: "N/A",
            resultMetadata: result,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          },
        ],
        { session },
      );

      await AuditLogModel.create(
        [
          {
            actorId: actorUserId,
            entity: "Ticket",
            entityId: ticket._id.toString(),
            action: "UPDATE",
            metadata: {
              details: `Ticket paid via ${method}`,
              previousStatus: "CLOSED",
              nextStatus: "PAID",
              paymentId: payment!._id.toString(),
              method,
              amountMinor: requiredTotalMinor,
              discountMinor: ticket.discountMinor,
              totalMinor: ticket.totalMinor,
            },
          },
        ],
        { session },
      );
    });

    if (result && typeof result === "object" && "paymentId" in result) {
      // Publish event after transaction commits
      const realtime = getRealTimeProvider();
      await realtime.publish(getCashierChannel(), "ticket.paid.v1", {
        id: ticketId,
        status: "PAID",
        paymentId: (result as { paymentId: string }).paymentId,
      });
      await realtime.publish(
        getTableChannel(bill.tableId),
        "table.status.updated",
        {
          id: bill.tableId,
          status: "AVAILABLE",
        },
      );
    }

    return result;
  } finally {
    await session.endSession();
  }
}
