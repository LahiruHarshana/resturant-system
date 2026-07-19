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
import { getCashierQueue } from "@/server/cashier/queue-service";
import { TicketModel } from "@/server/db/models/ticket.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { UserModel } from "@/server/db/models/user.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
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

describe("getCashierQueue - unit", () => {
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
  });

  it("should return only CLOSED unpaid tickets sorted by closedAt", async () => {
    const table = await RestaurantTableModel.create({
      label: "T1",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });
    const waiter = await UserModel.create({
      name: "Alice",
      email: "alice@test.com",
      passwordHash: "x",
      rolesVersion: 1,
      sessionVersion: 1,
      isActive: true,
    });

    // OPEN ticket (should not be in queue)
    await TicketModel.create({
      ticketNo: 801,
      tableId: table._id,
      waiterId: waiter._id,
      status: "OPEN",
    });

    // CLOSED ticket 1
    await TicketModel.create({
      ticketNo: 802,
      tableId: table._id,
      waiterId: waiter._id,
      status: "CLOSED",
      closedAt: new Date("2026-07-14T10:00:00Z"),
      totalMinor: 5000,
    });

    // CLOSED ticket 2 (older)
    const closed2 = await TicketModel.create({
      ticketNo: 803,
      tableId: table._id,
      waiterId: waiter._id,
      status: "CLOSED",
      closedAt: new Date("2026-07-14T09:00:00Z"),
      totalMinor: 3000,
    });

    // PAID ticket (should not be in queue)
    await TicketModel.create({
      ticketNo: 804,
      tableId: table._id,
      waiterId: waiter._id,
      status: "PAID",
    });

    // CANCELLED ticket (should not be in queue)
    await TicketModel.create({
      ticketNo: 805,
      tableId: table._id,
      waiterId: waiter._id,
      status: "CANCELLED",
    });

    await OrderLineModel.create({
      ticketId: closed2._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Burger",
      priceSnapshotMinor: 2500,
      quantity: 2,
      stationTypeSnapshot: "KITCHEN",
      status: "SERVED",
    });

    const result = await getCashierQueue();
    expect(result.tickets.length).toBe(2);
    // Should sort oldest first
    expect(result.tickets[0]?.ticketNo).toBe(803);
    expect(result.tickets[1]?.ticketNo).toBe(802);
    expect(result.tickets[0]?.lineSummary[0]?.nameSnapshot).toBe("Burger");
  });

  it("cashier queue DTO is compact and contains no raw documents", async () => {
    const table = await RestaurantTableModel.create({
      label: "T2",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });
    const waiter = await UserModel.create({
      name: "Bob",
      email: "bob@test.com",
      passwordHash: "x",
      rolesVersion: 1,
      sessionVersion: 1,
      isActive: true,
    });

    await TicketModel.create({
      ticketNo: 806,
      tableId: table._id,
      waiterId: waiter._id,
      status: "CLOSED",
      closedAt: new Date(),
    });

    const result = await getCashierQueue();
    expect(result.tickets.length).toBeGreaterThan(0);
    const dto = result.tickets[0]!;

    expect(dto).not.toHaveProperty("_id");
    expect(dto).not.toHaveProperty("__v");
    expect(typeof dto.id).toBe("string");
  });
});
