import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { TicketModel } from "@/server/db/models/ticket.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { PaymentModel } from "@/server/db/models/payment.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { UserModel } from "@/server/db/models/user.model";
import mongoose from "mongoose";

// Route handlers will be dynamically imported inside tests

vi.mock("@/server/auth/authorization", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  requireAuthentication: vi.fn(),
}));

describe("Receipt API Integration", () => {
  let mockUserId: string;

  beforeEach(async () => {
    await startIntegrationDatabase();

    mockUserId = new mongoose.Types.ObjectId().toString();

    const authorization = await import("@/server/auth/authorization");
    vi.mocked(authorization.requirePermission).mockResolvedValue({
      userId: mockUserId,
      permissions: new Set(["receipt:print"]),
    });

    const sessionModule = await import("@/server/auth/session");
    vi.mocked(sessionModule.requireAuthentication).mockResolvedValue({
      user: { id: mockUserId, role: "CASHIER" },
    } as unknown as Awaited<
      ReturnType<typeof sessionModule.requireAuthentication>
    >);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
    await stopIntegrationDatabase();
  });

  it("36. should return receipt DTO for a paid ticket", async () => {
    const tableId = new mongoose.Types.ObjectId();
    const waiterId = new mongoose.Types.ObjectId();
    const cashierId = new mongoose.Types.ObjectId();
    const ticketId = new mongoose.Types.ObjectId();

    await RestaurantSettingsModel.create({
      key: "default",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 10,
      urgentAgingMinutes: 20,
      readySoundEnabled: true,
      serviceChargeBps: 0,
      taxBps: 0,
      restaurantName: "Integration Restaurant",
    });

    await RestaurantTableModel.create({
      _id: tableId,
      label: "T1",
      status: "OCCUPIED",
      seats: 4,
      zone: "Main",
    });
    await UserModel.create({
      _id: waiterId,
      name: "Waiter 1",
      email: "w@w.com",
      roles: [],
      passwordHash: "x",
      isActive: true,
    });
    await UserModel.create({
      _id: cashierId,
      name: "Cashier 1",
      email: "c@c.com",
      roles: [],
      passwordHash: "y",
      isActive: true,
    });

    await TicketModel.create({
      _id: ticketId,
      ticketNo: 1,
      status: "PAID",
      tableId,
      waiterId,
      openedAt: new Date(),
      paidAt: new Date(),
      subtotalMinor: 1000,
      discountMinor: 0,
      taxMinor: 100,
      serviceChargeMinor: 0,
      totalMinor: 1100,
    });

    await OrderLineModel.create({
      ticketId,
      status: "SERVED",
      menuItemId: new mongoose.Types.ObjectId(),
      stationId: new mongoose.Types.ObjectId(),
      stationTypeSnapshot: "KITCHEN",
      nameSnapshot: "Pizza",
      quantity: 1,
      priceSnapshotMinor: 1000,
      modifierSnapshots: [],
    });

    await PaymentModel.create({
      ticketId,
      cashierId,
      method: "CASH",
      amountMinor: 1100,
      tenderedMinor: 1500,
      changeMinor: 400,
      idempotencyKey: crypto.randomUUID(),
    });

    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt`,
    );
    const { GET: getReceiptHandler } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await getReceiptHandler(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.restaurantName).toBe("Integration Restaurant");
    expect(data.tableLabel).toBe("T1");
    expect(data.waiterName).toBe("Waiter 1");
    expect(data.payment.method).toBe("CASH");
    expect(data.payment.cashierName).toBe("Cashier 1");
    expect(data.totalMinor).toBe(1100);
  });

  it("37. should return PDF buffer headers", async () => {
    // Setup is minimal because PDF generation doesn't mock the DB inside the test directly,
    // we'll reuse the DB state from the previous test if this was sequence-dependent, but since we clear DB,
    // we must seed again.

    const tableId = new mongoose.Types.ObjectId();
    const ticketId = new mongoose.Types.ObjectId();

    await RestaurantSettingsModel.create({
      key: "default",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 10,
      urgentAgingMinutes: 20,
      serviceChargeBps: 0,
      taxBps: 0,
      readySoundEnabled: true,
    });
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 2,
      status: "PAID",
      tableId,
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      paidAt: new Date(),
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
    });
    await PaymentModel.create({
      ticketId,
      cashierId: new mongoose.Types.ObjectId(),
      method: "CARD",
      amountMinor: 0,
      tenderedMinor: 0,
      changeMinor: 0,
      idempotencyKey: crypto.randomUUID(),
    });

    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt/pdf`,
    );
    const { GET: getPdfHandler } =
      await import("@/app/api/cashier/tickets/[id]/receipt/pdf/route");
    const response = await getPdfHandler(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      `receipt-${ticketId.toString()}.pdf`,
    );
  });

  it("38. should send email successfully", async () => {
    const tableId = new mongoose.Types.ObjectId();
    const ticketId = new mongoose.Types.ObjectId();

    await RestaurantSettingsModel.create({
      key: "default",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 10,
      urgentAgingMinutes: 20,
      serviceChargeBps: 0,
      taxBps: 0,
      readySoundEnabled: true,
    });
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 3,
      status: "PAID",
      tableId,
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      paidAt: new Date(),
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
    });

    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt/email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          idempotencyKey: crypto.randomUUID(),
        }),
      },
    );

    const { POST: sendEmailHandler } =
      await import("@/app/api/cashier/tickets/[id]/receipt/email/route");
    const response = await sendEmailHandler(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("39. should reject unauthenticated request", async () => {
    const sessionModule = await import("@/server/auth/session");
    vi.mocked(sessionModule.requireAuthentication).mockResolvedValue(
      null as never,
    );
    const req = new Request(
      `http://localhost/api/cashier/tickets/${new mongoose.Types.ObjectId()}/receipt`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: new mongoose.Types.ObjectId().toString() }),
    });
    expect(response.status).toBe(401);
  });

  it("40. should reject unauthorized request", async () => {
    const authModule = await import("@/server/auth/authorization");
    vi.mocked(authModule.requirePermission).mockRejectedValue(
      Object.assign(new Error("Forbidden"), { status: 403 }),
    );
    const req = new Request(
      `http://localhost/api/cashier/tickets/${new mongoose.Types.ObjectId()}/receipt`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: new mongoose.Types.ObjectId().toString() }),
    });
    expect(response.status).toBe(403);
  });

  it("41. should reject OPEN ticket", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 4,
      status: "OPEN",
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
    });
    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    expect(response.status).toBe(409);
  });

  it("42. should return 400 for invalid email", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt/email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid", idempotencyKey: "123" }),
      },
    );
    const { POST } =
      await import("@/app/api/cashier/tickets/[id]/receipt/email/route");
    const response = await POST(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    expect(response.status).toBe(400);
  });

  it("43. pdf route should reject unpaid ticket", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 5,
      status: "OPEN",
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
    });
    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt/pdf`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/pdf/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    expect(response.status).toBe(409);
  });
  it("46. should return 404 for missing ticket", async () => {
    const req = new Request(
      `http://localhost/api/cashier/tickets/${new mongoose.Types.ObjectId()}/receipt`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: new mongoose.Types.ObjectId().toString() }),
    });
    expect(response.status).toBe(404);
  });

  it("47. should reject CLOSED unpaid ticket", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 10,
      status: "CLOSED",
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
    });
    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    expect(response.status).toBe(409);
  });

  it("48. should reject CANCELLED ticket", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 11,
      status: "CANCELLED",
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
    });
    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    expect(response.status).toBe(409);
  });

  it("49. PAID ticket with missing payment follows policy", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 12,
      status: "PAID",
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 0,
    });
    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    expect(response.status).toBe(500);
  });

  it("50. client cannot override receipt DTO properties via API payload", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    await RestaurantSettingsModel.create({
      key: "default",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 10,
      urgentAgingMinutes: 20,
      readySoundEnabled: true,
      serviceChargeBps: 0,
      taxBps: 0,
      restaurantName: "Integration Restaurant",
    });
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 13,
      status: "PAID",
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      paidAt: new Date(),
      subtotalMinor: 500,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 500,
    });
    await PaymentModel.create({
      ticketId,
      cashierId: new mongoose.Types.ObjectId(),
      method: "CASH",
      amountMinor: 500,
      tenderedMinor: 500,
      changeMinor: 0,
      idempotencyKey: crypto.randomUUID(),
    });
    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt?totalMinor=1000&paymentMethod=CARD&ticketNo=999`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    const data = await response.json();
    expect(data.totalMinor).toBe(500);
    expect(data.payment.method).toBe("CASH");
    expect(data.ticketNo).toBe(13);
  });

  it("51. Receipt DTO contains no raw documents and exposes no secrets", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    await RestaurantSettingsModel.create({
      key: "default",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 10,
      urgentAgingMinutes: 20,
      readySoundEnabled: true,
      serviceChargeBps: 0,
      taxBps: 0,
      restaurantName: "Integration Restaurant",
    });
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 14,
      status: "PAID",
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      paidAt: new Date(),
      subtotalMinor: 500,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 500,
    });
    await PaymentModel.create({
      ticketId,
      cashierId: new mongoose.Types.ObjectId(),
      method: "CASH",
      amountMinor: 500,
      tenderedMinor: 500,
      changeMinor: 0,
      idempotencyKey: crypto.randomUUID(),
    });
    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    const data = await response.json();
    expect(data).not.toHaveProperty("_id");
    expect(data).not.toHaveProperty("__v");
    expect(data.payment).not.toHaveProperty("_id");
    expect(data).not.toHaveProperty("passwordHash");
  });

  it("52. Receipt totals match paid ticket total and use integer minor units", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    await RestaurantSettingsModel.create({
      key: "default",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 10,
      urgentAgingMinutes: 20,
      readySoundEnabled: true,
      serviceChargeBps: 0,
      taxBps: 0,
      restaurantName: "Integration Restaurant",
    });
    await TicketModel.create({
      _id: ticketId,
      ticketNo: 15,
      status: "PAID",
      tableId: new mongoose.Types.ObjectId(),
      waiterId: new mongoose.Types.ObjectId(),
      openedAt: new Date(),
      paidAt: new Date(),
      subtotalMinor: 500,
      discountMinor: 0,
      taxMinor: 0,
      serviceChargeMinor: 0,
      totalMinor: 500,
    });
    await PaymentModel.create({
      ticketId,
      cashierId: new mongoose.Types.ObjectId(),
      method: "CASH",
      amountMinor: 500,
      tenderedMinor: 500,
      changeMinor: 0,
      idempotencyKey: crypto.randomUUID(),
    });
    const req = new Request(
      `http://localhost/api/cashier/tickets/${ticketId}/receipt`,
    );
    const { GET } =
      await import("@/app/api/cashier/tickets/[id]/receipt/route");
    const response = await GET(req, {
      params: Promise.resolve({ id: ticketId.toString() }),
    });
    const data = await response.json();
    expect(data.totalMinor).toBe(500);
    expect(Number.isInteger(data.totalMinor)).toBe(true);
    expect(Number.isInteger(data.subtotalMinor)).toBe(true);
    expect(Number.isInteger(data.taxMinor)).toBe(true);
    expect(Number.isInteger(data.payment.tenderedMinor)).toBe(true);
  });
});
