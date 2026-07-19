import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { closeTicket } from "@/server/waiter/ticket-service";
import { TicketModel } from "@/server/db/models/ticket.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import * as publishModule from "@/server/realtime/publish";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import mongoose from "mongoose";
import * as auth from "@/server/auth/authorization";

vi.mock("@/server/auth/authorization", () => ({
  requirePermission: vi.fn(),
}));

describe("closeTicket - unit", () => {
  beforeAll(async () => {
    await startIntegrationDatabase();
  });

  afterAll(async () => {
    await stopIntegrationDatabase();
  });

  beforeEach(async () => {
    await clearIntegrationDatabase();
    vi.mocked(auth.requirePermission).mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
    } as unknown as Awaited<ReturnType<typeof auth.requirePermission>>);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("should successfully close a valid ticket with SERVED lines", async () => {
    const table = await RestaurantTableModel.create({
      label: "T1",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });

    const ticket = await TicketModel.create({
      ticketNo: 999,
      tableId: table._id,
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
    });

    await RestaurantSettingsModel.create({
      key: "default",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 15,
      urgentAgingMinutes: 30,
      taxBps: 1000,
      serviceChargeBps: 500,
    });

    await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Item",
      priceSnapshotMinor: 1000,
      quantity: 2, // 2000 subtotal
      stationTypeSnapshot: "KITCHEN",
      status: "SERVED",
    });

    const result = await closeTicket(ticket._id.toString(), "idemp-close-1");

    expect(result.success).toBe(true);
    expect(result.ticket?.status).toBe("CLOSED");
    expect(result.ticket?.totalMinor).toBe(2300); // 2000 + 200 tax + 100 svc
  });

  it("should reject closing an empty ticket", async () => {
    const ticket = await TicketModel.create({
      ticketNo: 998,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
    });

    await expect(
      closeTicket(ticket._id.toString(), "idemp-close-2"),
    ).rejects.toThrow("Cannot close an empty ticket");
  });

  it("should reject closing a ticket with unserved lines", async () => {
    const ticket = await TicketModel.create({
      ticketNo: 997,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
    });

    await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Item",
      priceSnapshotMinor: 1000,
      quantity: 1,
      stationTypeSnapshot: "KITCHEN",
      status: "PREPARING", // Blocks close
    });

    await expect(
      closeTicket(ticket._id.toString(), "idemp-close-3"),
    ).rejects.toThrow("unserved items");
  });

  it("should be idempotent on duplicate calls", async () => {
    const ticket = await TicketModel.create({
      ticketNo: 996,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
    });

    await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Item",
      priceSnapshotMinor: 1000,
      quantity: 1,
      stationTypeSnapshot: "KITCHEN",
      status: "SERVED",
    });

    const res1 = await closeTicket(ticket._id.toString(), "idemp-close-4");
    expect(res1.success).toBe(true);

    const res2 = await closeTicket(ticket._id.toString(), "idemp-close-4");
    expect(res2.success).toBe(true);
    expect(res2.ticket?.status).toBe("CLOSED");
  });

  it("should reject closing a ticket with NEW lines", async () => {
    const ticket = await TicketModel.create({
      ticketNo: 995,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
    });

    await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Item",
      priceSnapshotMinor: 1000,
      quantity: 1,
      stationTypeSnapshot: "KITCHEN",
      status: "NEW", // Blocks close
    });

    await expect(
      closeTicket(ticket._id.toString(), "idemp-close-5"),
    ).rejects.toThrow("unserved items");
  });

  it("missing ticket returns 404 behavior", async () => {
    const randomId = new mongoose.Types.ObjectId().toString();
    await expect(closeTicket(randomId, "idemp-close-missing")).rejects.toThrow(
      "Ticket not found",
    );
  });

  it("should reject closing a ticket with READY lines", async () => {
    const ticket = await TicketModel.create({
      ticketNo: 994,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
    });

    await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Item",
      priceSnapshotMinor: 1000,
      quantity: 1,
      stationTypeSnapshot: "KITCHEN",
      status: "READY", // Blocks close
    });

    await expect(
      closeTicket(ticket._id.toString(), "idemp-close-6"),
    ).rejects.toThrow("unserved items");
  });

  it("should reject closing a PAID ticket", async () => {
    const ticket = await TicketModel.create({
      ticketNo: 993,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      status: "PAID",
    });

    await expect(
      closeTicket(ticket._id.toString(), "idemp-close-7"),
    ).rejects.toThrow(
      "Cannot close a ticket that is already PAID or CANCELLED",
    );
  });

  it("should reject closing a CANCELLED ticket", async () => {
    const ticket = await TicketModel.create({
      ticketNo: 992,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      status: "CANCELLED",
    });

    await expect(
      closeTicket(ticket._id.toString(), "idemp-close-8"),
    ).rejects.toThrow(
      "Cannot close a ticket that is already PAID or CANCELLED",
    );
  });

  it("closing creates safe audit evidence", async () => {
    const ticket = await TicketModel.create({
      ticketNo: 991,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
    });

    await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Item",
      priceSnapshotMinor: 1000,
      quantity: 1,
      stationTypeSnapshot: "KITCHEN",
      status: "SERVED",
    });

    await closeTicket(ticket._id.toString(), "idemp-close-9");

    const logs = await AuditLogModel.find({
      entityId: ticket._id.toString(),
      action: "CLOSE_TICKET",
    });
    expect(logs.length).toBe(1);
    expect(logs[0]!.metadata).toHaveProperty("totalMinor");
  });

  it("close publishes typed realtime event after commit", async () => {
    const publishSpy = vi
      .spyOn(publishModule, "publishToCashier")
      .mockResolvedValue({ success: true });

    const ticket = await TicketModel.create({
      ticketNo: 990,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
    });

    await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Item",
      priceSnapshotMinor: 1000,
      quantity: 1,
      stationTypeSnapshot: "KITCHEN",
      status: "SERVED",
    });

    await closeTicket(ticket._id.toString(), "idemp-close-10");

    expect(publishSpy).toHaveBeenCalledWith(
      "ticket.closed.v1",
      expect.objectContaining({
        id: ticket._id.toString(),
      }),
    );
  });
});
