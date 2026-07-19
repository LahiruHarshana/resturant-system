import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import mongoose from "mongoose";
import { startIntegrationDatabase } from "../support/database";
import { addOrderLines, fireTicketLines } from "@/server/waiter/order-service";
import { TicketModel } from "@/server/db/models/ticket.model";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { StationModel } from "@/server/db/models/station.model";
import { MenuCategoryModel } from "@/server/db/models/menu-category.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { ZoneModel } from "@/server/db/models/zone.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import { IdempotencyRecordModel } from "@/server/db/models/idempotency-record.model";
import * as authorization from "@/server/auth/authorization";
import { POST } from "@/app/api/waiter/tickets/[id]/fire/route";
import { auth } from "@/auth";
import {
  getTestRealTimeProvider,
  __resetRealTimeProviderForTest,
} from "@/server/realtime";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Waiter Fire Ticket Service (Guide 12)", () => {
  beforeAll(async () => {
    await startIntegrationDatabase();
  });

  beforeEach(async () => {
    await TicketModel.deleteMany({});
    await MenuItemModel.deleteMany({});
    await StationModel.deleteMany({});
    await MenuCategoryModel.deleteMany({});
    await RestaurantTableModel.deleteMany({});
    await ZoneModel.deleteMany({});
    await RestaurantSettingsModel.deleteMany({});
    await OrderLineModel.deleteMany({});
    await AuditLogModel.deleteMany({});
    await IdempotencyRecordModel.deleteMany({});
    __resetRealTimeProviderForTest();
    vi.clearAllMocks();
  });

  async function seedBasicSetup() {
    const table = await RestaurantTableModel.create({
      label: "T1",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });

    const waiterId = new mongoose.Types.ObjectId();

    const ticket = await TicketModel.create({
      ticketNo: 1,
      tableId: table._id,
      waiterId,
      status: "OPEN",
      guestCount: 2,
    });

    const kitchenStation = await StationModel.create({
      name: "Hot",
      type: "KITCHEN",
      isActive: true,
    });

    const barStation = await StationModel.create({
      name: "Bar",
      type: "BAR",
      isActive: true,
    });

    const category = await MenuCategoryModel.create({
      name: "Mains",
      isActive: true,
    });

    const burger = await MenuItemModel.create({
      categoryId: category._id,
      stationId: kitchenStation._id,
      name: "Burger",
      isAvailable: true,
      priceMinor: 1000,
    });

    const coke = await MenuItemModel.create({
      categoryId: category._id,
      stationId: barStation._id,
      name: "Coke",
      isAvailable: true,
      priceMinor: 300,
    });

    return {
      table,
      ticket,
      kitchenStation,
      barStation,
      burger,
      coke,
      waiterId,
    };
  }

  function mockAuth(userId: string, permissions: string[]) {
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId,
      permissions: new Set(permissions),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    vi.mocked(auth).mockResolvedValue({
      user: { id: userId, permissions },
    } as never);
  }

  it("should fire valid existing lines and group by station (Kitchen and Bar)", async () => {
    const { ticket, burger, coke, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    // Add lines first
    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-1",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
        {
          menuItemId: coke._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    const lineIds = added.lines.map((l) => l.id);

    // Now fire them
    const fired = await fireTicketLines(ticket._id.toString(), {
      idempotencyKey: "fire-1",
      lineIds,
    });

    expect(fired.success).toBe(true);
    expect(fired.stations.length).toBe(2);
    expect(
      fired.stations.find((s) => s.stationTypeSnapshot === "KITCHEN")!,
    ).toBeDefined();
    expect(
      fired.stations.find((s) => s.stationTypeSnapshot === "BAR")!,
    ).toBeDefined();
    expect(fired.stations[0]!.lines[0]!.status).toBe("NEW");

    // Check API returns compact grouped station payload
    const req = new Request("http://localhost/api/waiter/tickets/1/fire", {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: "fire-1-api", lineIds }),
    });
    const res = await POST(req, {
      params: Promise.resolve({ id: ticket._id.toString() }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stations.length).toBe(2);

    const provider = getTestRealTimeProvider();
    // 1 ticket updated event + 2 line created events (x2 because we fired directly and via API)
    expect(provider.publishedEvents.length).toBe(6);
    expect(
      provider.publishedEvents.find((e) => e.event === "ticket.updated.v1"),
    ).toBeDefined();
    expect(
      provider.publishedEvents.filter((e) => e.event === "line.created.v1")
        .length,
    ).toBe(4);
  });

  it("unauthenticated request returns 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.spyOn(authorization, "requirePermission").mockRejectedValue(
      new Error("Unauthenticated"),
    );
    const req = new Request("http://localhost/api/waiter/tickets/1/fire", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "test",
        lineIds: [new mongoose.Types.ObjectId().toString()],
      }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("user without permission returns 403", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    vi.mocked(auth).mockResolvedValue({
      user: { id: userId, permissions: [] },
    } as never);
    vi.spyOn(authorization, "requirePermission").mockRejectedValue(
      new Error("Unauthorized: missing permission order:update"),
    );

    const req = new Request("http://localhost/api/waiter/tickets/1/fire", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "test",
        lineIds: [new mongoose.Types.ObjectId().toString()],
      }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });

  it("missing ticket returns 404", async () => {
    mockAuth(new mongoose.Types.ObjectId().toString(), ["order:update"]);
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = new Request(
      `http://localhost/api/waiter/tickets/${fakeId}/fire`,
      {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: "test",
          lineIds: [new mongoose.Types.ObjectId().toString()],
        }),
      },
    );
    const res = await POST(req, { params: Promise.resolve({ id: fakeId }) });
    expect(res.status).toBe(404);
  });

  it("CLOSED ticket rejects fire", async () => {
    const { ticket, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-2",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    await TicketModel.updateOne({ _id: ticket._id }, { status: "CLOSED" });

    await expect(
      fireTicketLines(ticket._id.toString(), {
        idempotencyKey: "fire-2",
        lineIds: added.lines.map((l) => l.id),
      }),
    ).rejects.toThrow("Only OPEN tickets can be modified");
  });

  it("PAID ticket rejects fire", async () => {
    const { ticket, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-paid",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    await TicketModel.updateOne({ _id: ticket._id }, { status: "PAID" });

    await expect(
      fireTicketLines(ticket._id.toString(), {
        idempotencyKey: "fire-paid",
        lineIds: added.lines.map((l) => l.id),
      }),
    ).rejects.toThrow("Only OPEN tickets can be modified");
  });

  it("CANCELLED/VOID ticket rejects fire", async () => {
    const { ticket, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-void-ticket",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    await TicketModel.updateOne({ _id: ticket._id }, { status: "VOID" });

    await expect(
      fireTicketLines(ticket._id.toString(), {
        idempotencyKey: "fire-void",
        lineIds: added.lines.map((l) => l.id),
      }),
    ).rejects.toThrow("Only OPEN tickets can be modified");
  });

  it("missing line returns safe error or skips gracefully", async () => {
    const { ticket, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const missingLineId = new mongoose.Types.ObjectId().toString();

    // System rejects firing if lines don't exist
    await expect(
      fireTicketLines(ticket._id.toString(), {
        idempotencyKey: "fire-missing",
        lineIds: [missingLineId],
      }),
    ).rejects.toThrow("One or more order lines not found");
  });

  it("line from another ticket is rejected", async () => {
    const { ticket: ticket1, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const table2 = await RestaurantTableModel.create({
      label: "T2",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });

    const ticket2 = await TicketModel.create({
      ticketNo: 2,
      tableId: table2._id,
      waiterId,
      status: "OPEN",
      guestCount: 2,
    });

    const addedTo2 = await addOrderLines(ticket2._id.toString(), {
      idempotencyKey: "add-t2",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    // Try to fire ticket2's line under ticket1
    await expect(
      fireTicketLines(ticket1._id.toString(), {
        idempotencyKey: "fire-cross",
        lineIds: addedTo2.lines.map((l) => l.id),
      }),
    ).rejects.toThrow("Line belongs to a different ticket");
  });

  it("client cannot override stationId, stationType, status, or firedAt (malicious payload is stripped)", async () => {
    const { ticket, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-malicious",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    const maliciousPayload = {
      idempotencyKey: "fire-malicious",
      lineIds: added.lines.map((l) => l.id),
      stationId: new mongoose.Types.ObjectId().toString(),
      stationType: "FAKE",
      status: "SERVED",
      firedAt: new Date(Date.now() - 10000).toISOString(),
    };

    const req = new Request(
      `http://localhost/api/waiter/tickets/${ticket._id.toString()}/fire`,
      {
        method: "POST",
        body: JSON.stringify(maliciousPayload),
      },
    );

    const res = await POST(req, {
      params: Promise.resolve({ id: ticket._id.toString() }),
    });
    expect(res.status).toBe(201);

    // Verify the DB state wasn't compromised by the payload
    const line = await OrderLineModel.findById(added.lines[0]!.id).lean();
    expect(line!.stationId.toString()).not.toBe(maliciousPayload.stationId);
    expect(line!.stationTypeSnapshot).not.toBe(maliciousPayload.stationType);
    expect(line!.status).toBe("NEW"); // not SERVED
  });

  it("VOID line is rejected", async () => {
    const { ticket, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-3",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    await OrderLineModel.updateOne(
      { _id: added.lines[0]!.id },
      { status: "VOID" },
    );

    await expect(
      fireTicketLines(ticket._id.toString(), {
        idempotencyKey: "fire-3",
        lineIds: added.lines.map((l) => l.id),
      }),
    ).rejects.toThrow("Cannot fire a VOID line");
  });

  it("already-fired line behavior is deterministic", async () => {
    const { ticket, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-alr",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    const firstFire = await fireTicketLines(ticket._id.toString(), {
      idempotencyKey: "fire-first",
      lineIds: added.lines.map((l) => l.id),
    });

    const secondFire = await fireTicketLines(ticket._id.toString(), {
      idempotencyKey: "fire-second", // NEW idempotency key
      lineIds: added.lines.map((l) => l.id),
    });

    // It should just return them safely and not crash, grouping them identically.
    expect(secondFire.stations.length).toBe(1);
    expect(secondFire.stations[0]!.lines[0]!.id).toBe(
      firstFire.stations[0]!.lines[0]!.id,
    );
  });

  it("snapshots remain unchanged after fire and ticket totals remain unchanged and integer minor-unit based", async () => {
    const { ticket, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-snap",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    expect(added.ticket.totalMinor).toBe(1000);

    const fired = await fireTicketLines(ticket._id.toString(), {
      idempotencyKey: "fire-snap",
      lineIds: added.lines.map((l) => l.id),
    });

    expect(fired.ticket.totalMinor).toBe(1000); // Unchanged
    expect(Number.isInteger(fired.ticket.totalMinor)).toBe(true);

    const lineDb = await OrderLineModel.findById(added.lines[0]!.id).lean();
    expect(lineDb?.nameSnapshot).toBe("Burger");
    expect(lineDb?.priceSnapshotMinor).toBe(1000);
  });

  it("audit evidence is created safely", async () => {
    const { ticket, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-audit",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    await fireTicketLines(ticket._id.toString(), {
      idempotencyKey: "fire-audit",
      lineIds: added.lines.map((l) => l.id),
    });

    const logs = await AuditLogModel.find({ action: "FIRE_ORDER" }).lean();
    const fireLogs = logs.filter(
      (l) => l.metadata && "lineIds" in (l.metadata as object),
    );
    if (fireLogs.length !== 1) console.log("Audit Logs found:", logs);
    expect(fireLogs.length).toBe(1);
    expect(fireLogs[0]?.entityId?.toString()).toBe(ticket._id.toString());
    expect(fireLogs[0]?.actorId?.toString()).toBe(waiterId.toString());
  });

  it("concurrent fire requests produce one authoritative result", async () => {
    const { ticket, burger, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-conc",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    const req = {
      idempotencyKey: "fire-conc",
      lineIds: added.lines.map((l) => l.id),
    };

    // Fire 5 times concurrently with same idempotency key
    const results = await Promise.all([
      fireTicketLines(ticket._id.toString(), req),
      fireTicketLines(ticket._id.toString(), req),
      fireTicketLines(ticket._id.toString(), req),
      fireTicketLines(ticket._id.toString(), req),
      fireTicketLines(ticket._id.toString(), req),
    ]);

    results.forEach((res) => {
      expect(res.stations.length).toBe(1);
      expect(res.stations[0]!.lines.length).toBe(1);
    });

    // Check idempotency records
    const records = await IdempotencyRecordModel.find({
      key: "fire-conc",
    }).lean();
    expect(records.length).toBe(1);
  });

  it("failed fire leaves no partial mutation", async () => {
    const { ticket, burger, coke, waiterId } = await seedBasicSetup();
    mockAuth(waiterId.toString(), ["order:update"]);

    const added = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "add-fail",
      lines: [
        {
          menuItemId: burger._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
        {
          menuItemId: coke._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    });

    // Manually void one line
    await OrderLineModel.updateOne(
      { _id: added.lines[0]!.id },
      { status: "VOID" },
    );

    // Try to fire both lines. The transaction should abort because one is VOID.
    await expect(
      fireTicketLines(ticket._id.toString(), {
        idempotencyKey: "fire-fail",
        lineIds: added.lines.map((l) => l.id),
      }),
    ).rejects.toThrow("Cannot fire a VOID line");

    // The other line should NOT have firedAt set
    const cokeLine = await OrderLineModel.findById(added.lines[1]!.id).lean();
    expect(cokeLine?.firedAt).toBeUndefined();
  });
});
