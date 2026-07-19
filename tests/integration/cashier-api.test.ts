import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { TicketModel } from "@/server/db/models/ticket.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { UserModel } from "@/server/db/models/user.model";
import * as auth from "@/server/auth/authorization";
import mongoose from "mongoose";

vi.mock("@/server/auth/authorization", () => ({
  requirePermission: vi.fn(),
}));

describe("Cashier API Integration", () => {
  beforeAll(async () => {
    await startIntegrationDatabase();
  });

  afterAll(async () => {
    await stopIntegrationDatabase();
  });

  beforeEach(async () => {
    await clearIntegrationDatabase();
  });

  it("should block unauthenticated close request", async () => {
    vi.mocked(auth.requirePermission).mockRejectedValue(
      new Error("Authentication required"),
    );

    const req = new Request("http://localhost/api/waiter/tickets/123/close", {
      method: "PATCH",
      body: JSON.stringify({ idempotencyKey: "123" }),
    });

    const { PATCH } = await import("@/app/api/waiter/tickets/[id]/close/route");
    const res = await PATCH(req, { params: Promise.resolve({ id: "123" }) });
    expect(res.status).toBe(401);
  });

  it("should successfully close a valid ticket and show it in the queue", async () => {
    const waiter = await UserModel.create({
      name: "Waiter 1",
      email: "w1@test.com",
      passwordHash: "x",
      rolesVersion: 1,
      sessionVersion: 1,
      isActive: true,
    });

    vi.mocked(auth.requirePermission).mockImplementation(async (perm) => {
      if (perm === "order:close" || perm === "payment:create") {
        return {
          userId: waiter._id.toString(),
          roles: [],
          permissions: new Set([perm]),
        } as unknown as ReturnType<typeof auth.requirePermission>;
      }
      throw new Error("Access denied");
    });

    const table = await RestaurantTableModel.create({
      label: "T5",
      seats: 4,
      zone: "Main",
      status: "OCCUPIED",
    });
    const ticket = await TicketModel.create({
      ticketNo: 505,
      tableId: table._id,
      waiterId: waiter._id,
      status: "OPEN",
    });

    await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Pasta",
      priceSnapshotMinor: 1500,
      quantity: 1,
      stationTypeSnapshot: "KITCHEN",
      status: "SERVED",
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

    const { PATCH } = await import("@/app/api/waiter/tickets/[id]/close/route");
    const patchReq = new Request(
      "http://localhost/api/waiter/tickets/" + ticket._id.toString() + "/close",
      {
        method: "PATCH",
        body: JSON.stringify({ idempotencyKey: "close-1" }),
      },
    );

    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ id: ticket._id.toString() }),
    });
    expect(patchRes.status).toBe(200);

    const { GET } = await import("@/app/api/cashier/queue/route");
    const getRes = await GET();

    expect(getRes.status).toBe(200);
    const data = await getRes.json();

    expect(data.tickets).toHaveLength(1);
    expect(data.tickets[0].status).toBe("CLOSED");
    expect(data.tickets[0].totalMinor).toBe(1725); // 1500 + 150 + 75
  });

  it("user without permission receives 403 on close", async () => {
    const { AuthorizationError } = await import("@/server/auth/errors");
    vi.mocked(auth.requirePermission).mockRejectedValue(
      new AuthorizationError("Access denied"),
    );

    const { PATCH } = await import("@/app/api/waiter/tickets/[id]/close/route");
    const req = new Request("http://localhost/api/waiter/tickets/1/close", {
      method: "PATCH",
      body: JSON.stringify({
        idempotencyKey: `00000000-0000-0000-0000-000000000001`,
      }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });

  it("missing ticket returns 404 on close", async () => {
    vi.mocked(auth.requirePermission).mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      roles: [],
      permissions: new Set(["order:close"]),
    } as unknown as Awaited<ReturnType<typeof auth.requirePermission>>);

    const { PATCH } = await import("@/app/api/waiter/tickets/[id]/close/route");
    const req = new Request("http://localhost/api/waiter/tickets/1/close", {
      method: "PATCH",
      body: JSON.stringify({
        idempotencyKey: `00000000-0000-0000-0000-000000000002`,
      }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: new mongoose.Types.ObjectId().toString() }),
    });
    expect(res.status).toBe(404);
  });

  it("rejects malicious payload overriding totals or state during close", async () => {
    vi.mocked(auth.requirePermission).mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      roles: [],
      permissions: new Set(["order:close"]),
    } as unknown as Awaited<ReturnType<typeof auth.requirePermission>>);

    const table = await RestaurantTableModel.create({
      label: "T9",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });
    const ticket = await TicketModel.create({
      ticketNo: 9,
      tableId: table._id,
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

    const { PATCH } = await import("@/app/api/waiter/tickets/[id]/close/route");

    // Malicious payload attempting to override values
    const maliciousPayload = {
      status: "PAID",
      closedAt: "2020-01-01T00:00:00Z",
      totalMinor: 10,
      subtotalMinor: 10,
      tableStatus: "AVAILABLE",
      waiterId: new mongoose.Types.ObjectId().toString(),
      paymentState: "SETTLED",
    };

    const req = new Request(
      `http://localhost/api/waiter/tickets/${ticket._id}/close`,
      {
        method: "PATCH",
        body: JSON.stringify({
          idempotencyKey: `00000000-0000-0000-0000-000000000003`,
          ...maliciousPayload,
        }),
      },
    );

    const res = await PATCH(req, {
      params: Promise.resolve({ id: ticket._id.toString() }),
    });
    expect(res.status).toBe(200);

    // Query DB to ensure malicious payload was ignored
    const updatedTicket = await TicketModel.findById(ticket._id);
    expect(updatedTicket?.status).toBe("CLOSED"); // Server authoritative
    expect(updatedTicket?.totalMinor).not.toBe(10); // Ignored malicious total
    expect(updatedTicket?.waiterId.toString()).toBe(ticket.waiterId.toString());

    const updatedTable = await RestaurantTableModel.findById(table._id);
    expect(updatedTable?.status).toBe("OCCUPIED"); // Table remains occupied until paid
  });

  it("adding lines is rejected after close", async () => {
    vi.mocked(auth.requirePermission).mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      roles: [],
      permissions: new Set(["order:update"]),
    } as unknown as Awaited<ReturnType<typeof auth.requirePermission>>);

    const table = await RestaurantTableModel.create({
      label: "T1",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });
    const ticket = await TicketModel.create({
      ticketNo: 2,
      tableId: table._id,
      waiterId: new mongoose.Types.ObjectId(),
      status: "CLOSED",
    });
    const { POST } = await import("@/app/api/waiter/tickets/[id]/lines/route");
    const req = new Request(
      `http://localhost/api/waiter/tickets/${ticket._id}/lines`,
      {
        method: "POST",
        body: JSON.stringify({
          lines: [
            {
              menuItemId: new mongoose.Types.ObjectId().toString(),
              quantity: 1,
            },
          ],
          idempotencyKey: crypto.randomUUID(),
        }),
      },
    );
    const res = await POST(req, {
      params: Promise.resolve({ id: ticket._id.toString() }),
    });
    expect(res.status).toBe(409); // Only OPEN tickets can be modified
  });

  it("firing lines is rejected after close", async () => {
    vi.mocked(auth.requirePermission).mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      roles: [],
      permissions: new Set(["order:update"]),
    } as unknown as Awaited<ReturnType<typeof auth.requirePermission>>);
    const table = await RestaurantTableModel.create({
      label: "T2",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });
    const ticket = await TicketModel.create({
      ticketNo: 3,
      tableId: table._id,
      waiterId: new mongoose.Types.ObjectId(),
      status: "CLOSED",
    });
    const line = await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Item",
      priceSnapshotMinor: 1000,
      quantity: 1,
      stationTypeSnapshot: "KITCHEN",
      status: "NEW",
    });
    const { POST } = await import("@/app/api/waiter/tickets/[id]/fire/route");
    const req = new Request(
      `http://localhost/api/waiter/tickets/${ticket._id}/fire`,
      {
        method: "POST",
        body: JSON.stringify({
          lineIds: [line._id.toString()],
          idempotencyKey: crypto.randomUUID(),
        }),
      },
    );
    const res = await POST(req, {
      params: Promise.resolve({ id: ticket._id.toString() }),
    });
    expect(res.status).toBe(409); // Only OPEN tickets can be modified
  });

  it("serving lines is rejected after close", async () => {
    vi.mocked(auth.requirePermission).mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      roles: [],
      permissions: new Set(["order:update"]),
    } as unknown as Awaited<ReturnType<typeof auth.requirePermission>>);
    const table = await RestaurantTableModel.create({
      label: "T3",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });
    const ticket = await TicketModel.create({
      ticketNo: 4,
      tableId: table._id,
      waiterId: new mongoose.Types.ObjectId(),
      status: "CLOSED",
    });
    const line = await OrderLineModel.create({
      ticketId: ticket._id,
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      nameSnapshot: "Item",
      priceSnapshotMinor: 1000,
      quantity: 1,
      stationTypeSnapshot: "KITCHEN",
      status: "READY",
    });
    const { PATCH } =
      await import("@/app/api/waiter/tickets/[id]/lines/[lineId]/served/route");
    const req = new Request(
      `http://localhost/api/waiter/tickets/${ticket._id}/lines/${line._id}/served`,
      {
        method: "PATCH",
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({
        id: ticket._id.toString(),
        lineId: line._id.toString(),
      }),
    });
    expect(res.status).toBe(409); // Only OPEN tickets can be modified
  });

  it("concurrent close requests produce one authoritative result and duplicates get the same state", async () => {
    vi.mocked(auth.requirePermission).mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      roles: [],
      permissions: new Set(["order:close"]),
    } as unknown as Awaited<ReturnType<typeof auth.requirePermission>>);
    const table = await RestaurantTableModel.create({
      label: "T5",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });
    const ticket = await TicketModel.create({
      ticketNo: 5,
      tableId: table._id,
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

    const { PATCH } = await import("@/app/api/waiter/tickets/[id]/close/route");

    const req1 = new Request(
      `http://localhost/api/waiter/tickets/${ticket._id}/close`,
      {
        method: "PATCH",
        body: JSON.stringify({ idempotencyKey: "concurrent-close" }),
      },
    );
    const req2 = new Request(
      `http://localhost/api/waiter/tickets/${ticket._id}/close`,
      {
        method: "PATCH",
        body: JSON.stringify({ idempotencyKey: "concurrent-close" }),
      },
    );

    const [res1, res2] = await Promise.all([
      PATCH(req1, { params: Promise.resolve({ id: ticket._id.toString() }) }),
      PATCH(req2, { params: Promise.resolve({ id: ticket._id.toString() }) }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(body1.ticket.status).toBe("CLOSED");
    expect(body2.ticket.status).toBe("CLOSED");
  });
});
