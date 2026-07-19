import { describe, it, expect, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import {
  calculateBill,
  applyDiscount,
  recordPayment,
} from "@/server/cashier/billing-service";
import { TicketModel } from "@/server/db/models/ticket.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { PaymentModel } from "@/server/db/models/payment.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { IdempotencyRecordModel } from "@/server/db/models/idempotency-record.model";
import { randomUUID } from "crypto";

describe("billing-service - unit", () => {
  let replSet: MongoMemoryReplSet;

  beforeEach(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri(), { directConnection: true });

    await RestaurantSettingsModel.create({
      key: "default",
      currency: "LKR",
      currencyMinorDigits: 2,
      serviceChargeBps: 1000, // 10%
      taxBps: 1500, // 15%
      kitchenAgingMinutes: 15,
      urgentAgingMinutes: 30,
      readySoundEnabled: true,
    });
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  const setupMockData = async () => {
    const table = await RestaurantTableModel.create({
      label: "T1",
      zone: "MAIN",
      status: "OCCUPIED",
      seats: 4,
    });

    const ticket = await TicketModel.create({
      tableId: table._id,
      waiterId: new mongoose.Types.ObjectId(),
      ticketNo: 100,
      status: "CLOSED", // Must be CLOSED for billing operations
      guestCount: 2,
    });

    const line1 = await OrderLineModel.create({
      ticketId: ticket._id,
      stationId: new mongoose.Types.ObjectId(),
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      priceSnapshotMinor: 100000, // $10.00
      quantity: 2,
      status: "SERVED",
    });

    return { table, ticket, line1 };
  };

  it("should calculate bill correctly with integer minor units", async () => {
    const { ticket } = await setupMockData();

    // Calculate bill
    const bill = await calculateBill(ticket._id.toString());

    // Subtotal: 2 * 100000 = 200000
    // Discount: 0
    // Service Charge (10%): 20000
    // Tax (15%): 30000
    // Total: 200000 + 20000 + 30000 = 250000

    expect(bill.subtotalMinor).toBe(200000);
    expect(bill.discountMinor).toBe(0);
    expect(bill.serviceChargeMinor).toBe(20000);
    expect(bill.taxMinor).toBe(30000);
    expect(bill.totalMinor).toBe(250000);
  });

  it("should cap discount at subtotal", async () => {
    const { ticket } = await setupMockData();
    ticket.discountMinor = 300000; // Larger than subtotal
    await ticket.save();

    const bill = await calculateBill(ticket._id.toString());

    expect(bill.subtotalMinor).toBe(200000);
    expect(bill.discountMinor).toBe(200000); // Capped
    expect(bill.serviceChargeMinor).toBe(0);
    expect(bill.taxMinor).toBe(0);
    expect(bill.totalMinor).toBe(0);
  });

  it("should apply discount and save IdempotencyRecord", async () => {
    const { ticket } = await setupMockData();
    const actorId = new mongoose.Types.ObjectId().toString();
    const idempotencyKey = randomUUID();

    const result = await applyDiscount(
      ticket._id.toString(),
      50000,
      actorId,
      idempotencyKey,
    );
    expect(result).toEqual({ success: true });

    const updatedTicket = await TicketModel.findById(ticket._id);
    expect(updatedTicket?.discountMinor).toBe(50000);

    const idemp = await IdempotencyRecordModel.findOne({ key: idempotencyKey });
    expect(idemp).toBeTruthy();

    // Idempotent retry returns same result and does not throw
    const retryResult = await applyDiscount(
      ticket._id.toString(),
      999999,
      actorId,
      idempotencyKey,
    );
    expect(retryResult).toEqual({ success: true });

    // Discount shouldn't change
    const updatedTicket2 = await TicketModel.findById(ticket._id);
    expect(updatedTicket2?.discountMinor).toBe(50000);
  });

  it("should record payment correctly and free the table", async () => {
    const { ticket, table } = await setupMockData();
    const actorId = new mongoose.Types.ObjectId().toString();
    const idempotencyKey = randomUUID();

    // Subtotal 200000, total 250000
    const result = await recordPayment({
      ticketId: ticket._id.toString(),
      method: "CASH",
      tenderedMinor: 300000,
      idempotencyKey,
      actorUserId: actorId,
    });

    expect(result?.success).toBe(true);
    expect(result?.changeMinor).toBe(50000);
    expect(result?.paymentId).toBeDefined();

    const updatedTicket = await TicketModel.findById(ticket._id);
    expect(updatedTicket?.status).toBe("PAID");
    expect(updatedTicket?.paidAt).toBeDefined();

    const updatedTable = await RestaurantTableModel.findById(table._id);
    expect(updatedTable?.status).toBe("AVAILABLE");
    expect(updatedTable?.currentTicketId == null).toBe(true);

    const payment = await PaymentModel.findById(result?.paymentId);
    expect(payment?.amountMinor).toBe(250000);
    expect(payment?.changeMinor).toBe(50000);
    expect(payment?.tenderedMinor).toBe(300000);

    // Idempotent retry returns same exact result object
    const retryResult = await recordPayment({
      ticketId: ticket._id.toString(),
      method: "CASH",
      tenderedMinor: 999999, // diff amount should be ignored
      idempotencyKey,
      actorUserId: actorId,
    });

    expect(retryResult).toEqual(result);
  });

  it("should reject OPEN ticket", async () => {
    const { ticket } = await setupMockData();
    ticket.status = "OPEN";
    await ticket.save();
    const actorId = new mongoose.Types.ObjectId().toString();

    await expect(
      recordPayment({
        ticketId: ticket._id.toString(),
        method: "CASH",
        tenderedMinor: 250000,
        idempotencyKey: randomUUID(),
        actorUserId: actorId,
      }),
    ).rejects.toThrow("TICKET_NOT_CLOSED");
  });

  it("should reject insufficient cash tendered", async () => {
    const { ticket } = await setupMockData();
    const actorId = new mongoose.Types.ObjectId().toString();

    await expect(
      recordPayment({
        ticketId: ticket._id.toString(),
        method: "CASH",
        tenderedMinor: 10000, // Less than 250000
        idempotencyKey: randomUUID(),
        actorUserId: actorId,
      }),
    ).rejects.toThrow("INSUFFICIENT_TENDERED_AMOUNT");
  });
});
