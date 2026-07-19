import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  startIntegrationDatabase,
  clearIntegrationDatabase,
  stopIntegrationDatabase,
} from "../support/database";

import { StationModel } from "../../src/server/db/models/station.model";
import { TicketModel } from "../../src/server/db/models/ticket.model";
import { OrderLineModel } from "../../src/server/db/models/order-line.model";
import mongoose from "mongoose";
import * as publishModule from "../../src/server/realtime/publish";
import * as authorizationModule from "../../src/server/auth/authorization";

vi.mock("../../src/server/auth/session", () => ({
  requireAuthentication: vi.fn().mockResolvedValue({
    user: { id: "507f1f77bcf86cd799439011" },
  }),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const MOCK_API_URL = "http://localhost:3000";

describe("Waiter Serving API Integration", () => {
  let stationId: mongoose.Types.ObjectId;
  let ticketId: mongoose.Types.ObjectId;
  let line: { _id: mongoose.Types.ObjectId };

  beforeEach(async () => {
    await startIntegrationDatabase();
    vi.spyOn(publishModule, "publishToStation").mockResolvedValue({
      success: true,
    });
    vi.spyOn(publishModule, "publishToTable").mockResolvedValue({
      success: true,
    });
    vi.spyOn(authorizationModule, "requirePermission").mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      permissions: new Set(["order:update", "table:read"]) as Set<
        import("@/shared/authorization/permissions").PermissionKey
      >,
    });

    stationId = new mongoose.Types.ObjectId();
    ticketId = new mongoose.Types.ObjectId();

    await StationModel.create({
      _id: stationId,
      name: "Grill",
      type: "KITCHEN",
      isActive: true,
    });

    await TicketModel.create({
      _id: ticketId,
      ticketNo: 1,
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      guestCount: 2,
      status: "OPEN",
      openedAt: new Date(),
    });

    line = await OrderLineModel.create({
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
  });

  afterEach(async () => {
    await clearIntegrationDatabase();
    await stopIntegrationDatabase();
    vi.restoreAllMocks();
  });

  it("should successfully fetch ready lines and mark one as SERVED", async () => {
    // 1. Fetch ready lines
    const { GET } =
      await import("../../src/app/api/waiter/tickets/[id]/ready-lines/route");
    const getReq = new Request(
      `${MOCK_API_URL}/api/waiter/tickets/${ticketId}/ready-lines`,
    );

    const getRes = await GET(getReq as import("next/server").NextRequest, {
      params: Promise.resolve({ id: String(ticketId) }),
    });

    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.lines).toHaveLength(1);
    expect(getData.lines[0].id).toBe(line._id.toString());

    // 2. Mark line served
    const { PATCH } =
      await import("../../src/app/api/waiter/tickets/[id]/lines/[lineId]/served/route");
    const patchReq = new Request(
      `${MOCK_API_URL}/api/waiter/tickets/${ticketId}/lines/${line._id}/served`,
      {
        method: "PATCH",
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      },
    );

    const patchRes = await PATCH(
      patchReq as import("next/server").NextRequest,
      {
        params: Promise.resolve({
          id: String(ticketId),
          lineId: String(line._id),
        }),
      },
    );

    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);

    // 3. Verify it's no longer READY
    const updatedLine = await OrderLineModel.findById(line._id);
    expect(updatedLine?.status).toBe("SERVED");
  });

  it("unauthenticated request returns 401", async () => {
    // Override mock to throw AuthenticationError
    const authError = new Error("Authentication required");
    authError.name = "AuthenticationError";
    vi.spyOn(authorizationModule, "requirePermission").mockRejectedValue(
      authError,
    );

    const { PATCH } =
      await import("../../src/app/api/waiter/tickets/[id]/lines/[lineId]/served/route");
    const patchReq = new Request(
      `${MOCK_API_URL}/api/waiter/tickets/${ticketId}/lines/${line._id}/served`,
      {
        method: "PATCH",
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      },
    );

    const patchRes = await PATCH(
      patchReq as import("next/server").NextRequest,
      {
        params: Promise.resolve({
          id: String(ticketId),
          lineId: String(line._id),
        }),
      },
    );

    expect(patchRes.status).toBe(401);
  });

  it("user without permission returns 403", async () => {
    // Override mock to throw AuthorizationError
    const authError = new Error("Permission denied");
    authError.name = "AuthorizationError";
    vi.spyOn(authorizationModule, "requirePermission").mockRejectedValue(
      authError,
    );

    const { PATCH } =
      await import("../../src/app/api/waiter/tickets/[id]/lines/[lineId]/served/route");
    const patchReq = new Request(
      `${MOCK_API_URL}/api/waiter/tickets/${ticketId}/lines/${line._id}/served`,
      {
        method: "PATCH",
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      },
    );

    const patchRes = await PATCH(
      patchReq as import("next/server").NextRequest,
      {
        params: Promise.resolve({
          id: String(ticketId),
          lineId: String(line._id),
        }),
      },
    );

    expect(patchRes.status).toBe(403);
  });

  it("missing ticket returns 404", async () => {
    const { PATCH } =
      await import("../../src/app/api/waiter/tickets/[id]/lines/[lineId]/served/route");
    const patchReq = new Request(
      `${MOCK_API_URL}/api/waiter/tickets/65d1b7a2d4b58e0012345678/lines/${line._id}/served`,
      {
        method: "PATCH",
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      },
    );

    const patchRes = await PATCH(
      patchReq as import("next/server").NextRequest,
      {
        params: Promise.resolve({
          id: "65d1b7a2d4b58e0012345678",
          lineId: String(line._id),
        }),
      },
    );

    expect(patchRes.status).toBe(404);
  });

  it("missing line returns 404", async () => {
    const { PATCH } =
      await import("../../src/app/api/waiter/tickets/[id]/lines/[lineId]/served/route");
    const patchReq = new Request(
      `${MOCK_API_URL}/api/waiter/tickets/${ticketId}/lines/65d1b7a2d4b58e0012345678/served`,
      {
        method: "PATCH",
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      },
    );

    const patchRes = await PATCH(
      patchReq as import("next/server").NextRequest,
      {
        params: Promise.resolve({
          id: String(ticketId),
          lineId: "65d1b7a2d4b58e0012345678",
        }),
      },
    );

    expect(patchRes.status).toBe(404);
  });
});
