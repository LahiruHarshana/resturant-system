import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSalesSummary,
  getPaymentBreakdown,
} from "@/server/admin/report-service";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { TicketModel, PaymentModel } from "@/server/db/models";
import { Types } from "mongoose";

describe("Report Service Unit", () => {
  let mongoServer: MongoMemoryServer;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("5. Revenue includes PAID tickets/payments only & 9. Sales totals use integer minor units", async () => {
    const tableId = new Types.ObjectId();
    const waiterId = new Types.ObjectId();
    const now = new Date();

    // 1 PAID ticket
    await TicketModel.create({
      ticketNo: 1,
      tableId,
      waiterId,
      status: "PAID",
      totalMinor: 1500,
      paidAt: now,
    });

    // 1 OPEN ticket
    await TicketModel.create({
      ticketNo: 2,
      tableId,
      waiterId,
      status: "OPEN",
      totalMinor: 2000,
    });

    // 1 CLOSED unpaid ticket
    await TicketModel.create({
      ticketNo: 3,
      tableId,
      waiterId,
      status: "CLOSED",
      totalMinor: 3000,
      closedAt: now,
    });

    // 1 CANCELLED ticket
    await TicketModel.create({
      ticketNo: 4,
      tableId,
      waiterId,
      status: "CANCELLED",
      totalMinor: 4000,
      cancelledAt: now,
    });

    const range = {
      from: new Date(now.getTime() - 10000),
      to: new Date(now.getTime() + 10000),
    };

    const summary = await getSalesSummary(range);
    expect(summary.paidTicketCount).toBe(1);
    expect(summary.totalRevenueMinor).toBe(1500); // Only PAID ticket
    expect(summary.averageTicketValueMinor).toBe(1500);
    expect(summary.salesByDay.length).toBe(1);
  });

  it("10. Payment method breakdown is correct", async () => {
    const ticketId = new Types.ObjectId();
    const cashierId = new Types.ObjectId();
    const now = new Date();

    await TicketModel.create({
      _id: ticketId,
      ticketNo: 5,
      tableId: new Types.ObjectId(),
      waiterId: new Types.ObjectId(),
      status: "PAID",
      totalMinor: 3500,
      paidAt: now,
    });

    await PaymentModel.create({
      ticketId,
      cashierId,
      method: "CASH",
      amountMinor: 2000,
      tenderedMinor: 2000,
      idempotencyKey: "1",
    });

    await PaymentModel.create({
      ticketId,
      cashierId,
      method: "CARD",
      amountMinor: 1500,
      tenderedMinor: 1500,
      idempotencyKey: "2",
    });

    const range = {
      from: new Date(now.getTime() - 10000),
      to: new Date(now.getTime() + 10000),
    };

    const breakdown = await getPaymentBreakdown(range);
    expect(breakdown).toHaveLength(2);
    const cash = breakdown.find((b) => b.method === "CASH");
    const card = breakdown.find((b) => b.method === "CARD");
    expect(cash?.totalMinor).toBe(2000);
    expect(card?.totalMinor).toBe(1500);
  });

  it("11. Average ticket value calculation is correct", async () => {
    const tableId = new Types.ObjectId();
    const waiterId = new Types.ObjectId();
    const now = new Date();

    await TicketModel.create({
      ticketNo: 6,
      tableId,
      waiterId,
      status: "PAID",
      totalMinor: 1000,
      paidAt: now,
    });
    await TicketModel.create({
      ticketNo: 7,
      tableId,
      waiterId,
      status: "PAID",
      totalMinor: 2000,
      paidAt: now,
    });

    const range = {
      from: new Date(now.getTime() - 10000),
      to: new Date(now.getTime() + 10000),
    };

    const summary = await getSalesSummary(range);
    expect(summary.paidTicketCount).toBe(2);
    expect(summary.totalRevenueMinor).toBe(3000);
    expect(summary.averageTicketValueMinor).toBe(1500); // 3000 / 2
  });

  it("12. Empty period returns zero/empty DTO safely", async () => {
    const range = {
      from: new Date("2020-01-01"),
      to: new Date("2020-01-02"),
    };
    const summary = await getSalesSummary(range);
    expect(summary.paidTicketCount).toBe(0);
    expect(summary.totalRevenueMinor).toBe(0);
    expect(summary.averageTicketValueMinor).toBe(0);
    expect(summary.salesByDay).toHaveLength(0);
  });
});
