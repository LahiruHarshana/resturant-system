import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  startIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import * as authorization from "@/server/auth/authorization";
import mongoose from "mongoose";
import { ZoneModel } from "@/server/db/models/zone.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { GET as getTables } from "@/app/api/waiter/tables/route";
import { POST as createTicket } from "@/app/api/waiter/tickets/route";
import { GET as getTicketShell } from "@/app/api/waiter/tickets/[id]/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Waiter Core - API Exit Gate Workflow", () => {
  let waiterId: string;
  let activeTableId: string;

  beforeEach(async () => {
    await startIntegrationDatabase();
    waiterId = new mongoose.Types.ObjectId().toString();

    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: waiterId,
      permissions: new Set(["order:create", "table:read"]),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    await ZoneModel.create({ name: "Main", sortOrder: 1, isActive: true });
    const table = await RestaurantTableModel.create({
      label: "T1",
      seats: 4,
      zone: "Main",
      status: "AVAILABLE",
    });
    activeTableId = table._id.toString();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
  });

  function createMockRequest(url: string, body?: unknown) {
    return {
      url,
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  }

  it("should complete the waiter flow from floor view to ticket shell via Route Handlers", async () => {
    // 1. Fetch tables
    const reqTables = createMockRequest("http://localhost/api/waiter/tables");
    const resTables = await getTables(reqTables);
    expect(resTables.status).toBe(200);
    const dataTables = await resTables.json();

    expect(dataTables).toHaveLength(1);
    expect(dataTables[0].tables).toHaveLength(1);
    expect(dataTables[0].tables[0].label).toBe("T1");
    expect(dataTables[0].tables[0].status).toBe("AVAILABLE");

    // 2. Open ticket
    const reqTicket = createMockRequest("http://localhost/api/waiter/tickets", {
      tableId: activeTableId,
      guestCount: 2,
    });
    const resTicket = await createTicket(reqTicket);
    expect(resTicket.status).toBe(201);
    const dataTicket = await resTicket.json();

    expect(dataTicket.created).toBe(true);
    expect(dataTicket.ticket.ticketNo).toBeTypeOf("number");
    const ticketId = dataTicket.ticket.id;

    // 3. Fetch ticket shell
    const reqShell = createMockRequest(
      `http://localhost/api/waiter/tickets/${ticketId}`,
    );
    const resShell = await getTicketShell(reqShell, {
      params: Promise.resolve({ id: ticketId }),
    });
    expect(resShell.status).toBe(200);
    const dataShell = await resShell.json();

    expect(dataShell.id).toBe(ticketId);
    expect(dataShell.tableId).toBe(activeTableId);
    expect(dataShell.status).toBe("OPEN");
    expect(dataShell.guestCount).toBe(2);
  });
});
