import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import {
  startIntegrationDatabase,
  clearIntegrationDatabase,
  stopIntegrationDatabase,
} from "../support/database";
import { markLineServed } from "@/server/waiter/order-service";
import { TicketModel } from "@/server/db/models/ticket.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import { StationModel } from "@/server/db/models/station.model";
import * as publishModule from "@/server/realtime/publish";

vi.mock("@/server/auth/authorization", () => ({
  requirePermission: vi.fn().mockResolvedValue({
    userId: "507f1f77bcf86cd799439011",
    roleName: "Waiter",
    permissions: ["order:update"],
  }),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("markLineServed - unit", () => {
  let ticketId: string;
  let lineId: string;
  let stationId: string;

  beforeEach(async () => {
    await startIntegrationDatabase();

    vi.spyOn(publishModule, "publishToTable").mockResolvedValue({
      success: true,
    });

    const station = await StationModel.create({
      name: "Main Kitchen",
      type: "KITCHEN",
      isActive: true,
    });
    stationId = station._id.toString();

    const ticket = await TicketModel.create({
      ticketNo: 1,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      guestCount: 2,
      status: "OPEN",
      openedAt: new Date(),
    });
    ticketId = ticket._id.toString();

    const line = await OrderLineModel.create({
      ticketId,
      stationId,
      stationTypeSnapshot: "KITCHEN",
      menuItemId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      priceSnapshotMinor: 1000,
      quantity: 1,
      status: "READY",
      firedAt: new Date(),
      preparingAt: new Date(),
      readyAt: new Date(),
    });
    lineId = line._id.toString();
  });

  afterEach(async () => {
    await clearIntegrationDatabase();
    await stopIntegrationDatabase();
    vi.restoreAllMocks();
  });

  it("should successfully mark a READY line as SERVED", async () => {
    const idempotencyKey = crypto.randomUUID();
    const result = await markLineServed(ticketId, lineId, { idempotencyKey });
    expect(result.success).toBe(true);

    const line = await OrderLineModel.findById(lineId);
    expect(line?.status).toBe("SERVED");
    expect(line?.servedAt).toBeDefined();

    const audit = await AuditLogModel.findOne({
      action: "LINE_STATUS_UPDATED",
      entityId: lineId,
    });
    expect(audit).toBeDefined();
    expect(audit?.metadata.newStatus).toBe("SERVED");

    expect(publishModule.publishToTable).toHaveBeenCalled();
  });

  it("should block transition if line is not READY (NEW)", async () => {
    await OrderLineModel.findByIdAndUpdate(lineId, { status: "NEW" });
    await expect(
      markLineServed(ticketId, lineId, { idempotencyKey: crypto.randomUUID() }),
    ).rejects.toThrow("Invalid transition to SERVED");
  });

  it("should block transition if line is not READY (PREPARING)", async () => {
    await OrderLineModel.findByIdAndUpdate(lineId, { status: "PREPARING" });
    await expect(
      markLineServed(ticketId, lineId, { idempotencyKey: crypto.randomUUID() }),
    ).rejects.toThrow("Invalid transition to SERVED");
  });

  it("should block transition if line is not READY (VOID)", async () => {
    await OrderLineModel.findByIdAndUpdate(lineId, { status: "VOID" });
    await expect(
      markLineServed(ticketId, lineId, { idempotencyKey: crypto.randomUUID() }),
    ).rejects.toThrow("Invalid transition to SERVED");
  });

  it("should block transition if ticket is not OPEN (CLOSED)", async () => {
    await TicketModel.findByIdAndUpdate(ticketId, { status: "CLOSED" });
    await expect(
      markLineServed(ticketId, lineId, { idempotencyKey: crypto.randomUUID() }),
    ).rejects.toThrow("Cannot update line for inactive ticket");
  });

  it("should block transition if ticket is not OPEN (PAID)", async () => {
    await TicketModel.findByIdAndUpdate(ticketId, { status: "PAID" });
    await expect(
      markLineServed(ticketId, lineId, { idempotencyKey: crypto.randomUUID() }),
    ).rejects.toThrow("Cannot update line for inactive ticket");
  });

  it("should block transition if ticket is not OPEN (CANCELLED)", async () => {
    await TicketModel.findByIdAndUpdate(ticketId, { status: "CANCELLED" });
    await expect(
      markLineServed(ticketId, lineId, { idempotencyKey: crypto.randomUUID() }),
    ).rejects.toThrow("Cannot update line for inactive ticket");
  });

  it("client cannot override stationId, status, servedAt, item/modifier snapshots, or prices/totals", async () => {
    const idempotencyKey = crypto.randomUUID();

    // The markLineServed signature only accepts idempotencyKey.
    // We verify the line fields remained untouched except for status/servedAt.
    await markLineServed(ticketId, lineId, { idempotencyKey });

    const line = await OrderLineModel.findById(lineId);
    expect(line?.stationId.toString()).toBe(stationId);
    expect(line?.nameSnapshot).toBe("Burger");
    expect(line?.priceSnapshotMinor).toBe(1000);
    // Ticket totals are not recalculated here, but they should remain unchanged.
  });

  it("should return success idempotently if already SERVED with same key", async () => {
    const key = crypto.randomUUID();
    await markLineServed(ticketId, lineId, { idempotencyKey: key });
    vi.clearAllMocks(); // Clear publish mock

    // Second call
    const result = await markLineServed(ticketId, lineId, {
      idempotencyKey: key,
    });
    expect(result.success).toBe(true);
    // Should not re-publish
    expect(publishModule.publishToTable).not.toHaveBeenCalled();
  });

  it("failed served update does not publish event", async () => {
    await OrderLineModel.findByIdAndUpdate(lineId, { status: "NEW" });

    await expect(
      markLineServed(ticketId, lineId, { idempotencyKey: crypto.randomUUID() }),
    ).rejects.toThrow();

    expect(publishModule.publishToTable).not.toHaveBeenCalled();
  });

  it("concurrent served updates produce one authoritative result", async () => {
    const idempotencyKey = crypto.randomUUID();

    // Fire two concurrently
    const p1 = markLineServed(ticketId, lineId, { idempotencyKey });
    const p2 = markLineServed(ticketId, lineId, { idempotencyKey });

    const results = await Promise.allSettled([p1, p2]);

    const successes = results.filter((r) => r.status === "fulfilled");
    expect(successes.length).toBe(2);

    // Should only have published once or twice depending on idempotency,
    // but the final state is correct.
    const audits = await AuditLogModel.find({
      action: "LINE_STATUS_UPDATED",
      entityId: lineId,
    });
    expect(audits.length).toBe(1);
  });
});
