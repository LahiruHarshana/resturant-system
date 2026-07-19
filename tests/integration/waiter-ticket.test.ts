import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  startIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import * as authorization from "@/server/auth/authorization";
import mongoose from "mongoose";
import { ZoneModel } from "@/server/db/models/zone.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { TicketModel } from "@/server/db/models/ticket.model";
import {
  openTicketForTable,
  getTicketShell,
} from "@/server/waiter/ticket-service";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Waiter Core - Ticket Service & Concurrency", () => {
  let waiterId: string;
  let activeTableId: string;
  let inactiveTableId: string;

  beforeEach(async () => {
    await startIntegrationDatabase();

    waiterId = new mongoose.Types.ObjectId().toString();

    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: waiterId,
      permissions: new Set(["order:create", "table:read"]),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    const zone = await ZoneModel.create({
      name: "Patio",
      sortOrder: 1,
      isActive: true,
    });

    const activeTable = await RestaurantTableModel.create({
      label: "Patio 1",
      seats: 4,
      zone: zone.name,
      status: "AVAILABLE",
    });
    activeTableId = activeTable._id.toString();

    const inactiveTable = await RestaurantTableModel.create({
      label: "Patio 2",
      seats: 2,
      zone: zone.name,
      status: "INACTIVE",
    });
    inactiveTableId = inactiveTable._id.toString();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
  });

  it("should open a valid ticket and update table status atomically", async () => {
    const result = await openTicketForTable({
      tableId: activeTableId,
      guestCount: 2,
    });
    expect(result.created).toBe(true);
    expect(result.ticket.ticketNo).toBeTypeOf("number");

    // Verify DB state
    const table = await RestaurantTableModel.findById(activeTableId);
    expect(table?.status).toBe("OCCUPIED");
    expect(table?.currentTicketId?.toString()).toBe(result.ticket.id);

    const ticket = await TicketModel.findById(result.ticket.id);
    expect(ticket?.status).toBe("OPEN");
    expect(ticket?.guestCount).toBe(2);
    expect(ticket?.waiterId.toString()).toBe(waiterId);
  });

  it("should reject opening an inactive table", async () => {
    await expect(
      openTicketForTable({ tableId: inactiveTableId, guestCount: 2 }),
    ).rejects.toThrow("Table is inactive");
  });

  it("should resume an existing OPEN ticket without creating a duplicate", async () => {
    const firstResult = await openTicketForTable({
      tableId: activeTableId,
      guestCount: 3,
    });
    expect(firstResult.created).toBe(true);

    const secondResult = await openTicketForTable({
      tableId: activeTableId,
      guestCount: 4,
    });
    expect(secondResult.created).toBe(false);
    expect(secondResult.ticket.id).toBe(firstResult.ticket.id);
    expect(secondResult.ticket.guestCount).toBe(3); // Maintains original state
  });

  it("should prevent duplicate tickets from concurrent requests", async () => {
    // Read the Counter document's actual sequence value.
    const CounterModel = mongoose.model("Counter");
    const counterDocBefore = (await CounterModel.findOne({
      key: "ticketNo",
    }).lean()) as { seq: number } | null;
    const counterBefore = counterDocBefore?.seq ?? 0;

    // Count OPEN tickets for the table and confirm the count is 0.
    const openTicketsBefore = await TicketModel.countDocuments({
      tableId: activeTableId,
      status: "OPEN",
    });
    expect(openTicketsBefore).toBe(0);

    // Launch five simultaneous openTicketForTable calls for the same table.
    const requests = Array.from({ length: 5 }).map(() =>
      openTicketForTable({ tableId: activeTableId, guestCount: 2 }),
    );
    const results = await Promise.allSettled(requests);

    // Query the actual Counter document again as counterAfter.
    const counterDocAfter = (await CounterModel.findOne({
      key: "ticketNo",
    }).lean()) as { seq: number } | null;
    const counterAfter = counterDocAfter?.seq ?? 0;

    // Query the actual OPEN tickets for the table.
    const allOpenTickets = await TicketModel.find({
      tableId: activeTableId,
      status: "OPEN",
    });
    const openTicketCount = allOpenTickets.length;

    // Collect every response
    const fulfilledResults = results.map((r) => {
      if (r.status !== "fulfilled")
        throw new Error("A request rejected unexpectedly");
      return r.value;
    });

    const createdTrueCount = fulfilledResults.filter(
      (r) => r.created === true,
    ).length;
    const createdFalseCount = fulfilledResults.filter(
      (r) => r.created === false,
    ).length;

    const uniqueTicketIds = new Set(fulfilledResults.map((r) => r.ticket.id));
    const uniqueTicketNos = new Set(
      fulfilledResults.map((r) => r.ticket.ticketNo),
    );

    const authoritativeTicketId = fulfilledResults[0]!.ticket.id;

    // Asserts
    expect(counterAfter - counterBefore).toBe(1);
    expect(openTicketCount).toBe(1);
    expect(createdTrueCount).toBe(1);
    expect(createdFalseCount).toBe(4);
    expect(uniqueTicketIds.size).toBe(1);
    expect(uniqueTicketNos.size).toBe(1);

    const table = await RestaurantTableModel.findById(activeTableId);
    expect(table?.currentTicketId?.toString()).toBe(authoritativeTicketId);
    expect(table?.status).toBe("OCCUPIED");
  });

  it("should get a compact ticket shell safely", async () => {
    const { ticket } = await openTicketForTable({
      tableId: activeTableId,
      guestCount: 2,
    });
    const shell = await getTicketShell(ticket.id);

    expect(shell.id).toBe(ticket.id);
    expect(shell.tableId).toBe(activeTableId);
    expect(shell.status).toBe("OPEN");
    expect(
      (shell as unknown as Record<string, unknown>).passwordHash,
    ).toBeUndefined(); // Safe DTO
  });

  it("should enforce server-authoritative ticket fields", async () => {
    // Attempt to inject protected fields via the request payload
    const maliciousPayload = {
      tableId: activeTableId,
      guestCount: 2,
      waiterId: new mongoose.Types.ObjectId().toString(),
      status: "PAID",
      ticketNo: 9999,
      subtotalMinor: 5000,
      discountMinor: 1000,
      serviceChargeMinor: 500,
      taxMinor: 400,
      totalMinor: 4900,
      openedAt: new Date(2000, 1, 1).toISOString(),
      currentTicketId: new mongoose.Types.ObjectId().toString(),
    } as unknown as Parameters<typeof openTicketForTable>[0];

    const result = await openTicketForTable(maliciousPayload);

    expect(result.created).toBe(true);

    // Verify that the injected fields were completely ignored
    const ticket = await TicketModel.findById(result.ticket.id);
    expect(ticket?.waiterId.toString()).toBe(waiterId); // Must be the authenticated user
    expect(ticket?.status).toBe("OPEN"); // Must be OPEN initially
    expect(ticket?.ticketNo).not.toBe(9999); // Must be auto-generated
    expect(ticket?.subtotalMinor).toBe(0);
    expect(ticket?.discountMinor).toBe(0);
    expect(ticket?.serviceChargeMinor).toBe(0);
    expect(ticket?.taxMinor).toBe(0);
    expect(ticket?.totalMinor).toBe(0);

    // openedAt must be recent (server generated), definitely not year 2000
    expect(ticket?.openedAt.getFullYear()).toBeGreaterThan(2020);

    const table = await RestaurantTableModel.findById(activeTableId);
    expect(table?.currentTicketId?.toString()).toBe(result.ticket.id);
    expect(table?.currentTicketId?.toString()).not.toBe(
      (maliciousPayload as Record<string, unknown>).currentTicketId,
    );
  });
});
