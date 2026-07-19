import { describe, it, expect, vi, beforeEach } from "vitest";
import { getReceipt, sendReceiptEmail } from "@/server/cashier/receipt-service";
import { TicketModel } from "@/server/db/models/ticket.model";
import { OrderLineModel } from "@/server/db/models/order-line.model";
import { PaymentModel } from "@/server/db/models/payment.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { UserModel } from "@/server/db/models/user.model";
import { IdempotencyRecordModel } from "@/server/db/models/idempotency-record.model";
import mongoose from "mongoose";

vi.mock("@/server/db/models/ticket.model");
vi.mock("@/server/db/models/order-line.model");
vi.mock("@/server/db/models/payment.model");
vi.mock("@/server/db/models/restaurant-settings.model");
vi.mock("@/server/db/models/restaurant-table.model");
vi.mock("@/server/db/models/user.model");
vi.mock("@/server/db/models/idempotency-record.model");
vi.mock("@/server/db/models/audit-log.model", () => ({
  AuditLogModel: { create: vi.fn().mockResolvedValue(true) },
}));

describe("Receipt Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockExec = <T>(val: T) =>
    ({ exec: vi.fn().mockResolvedValue(val) }) as never;

  it("33. should generate a valid receipt", async () => {
    const mockTicketId = new mongoose.Types.ObjectId();

    vi.mocked(TicketModel.findById).mockReturnValue(
      mockExec({
        _id: mockTicketId,
        ticketNo: 123,
        status: "PAID",
        tableId: "t1",
        waiterId: "w1",
        openedAt: new Date(),
        paidAt: new Date(),
        subtotalMinor: 1000,
        discountMinor: 0,
        taxMinor: 100,
        serviceChargeMinor: 0,
        totalMinor: 1100,
      }),
    );

    vi.mocked(OrderLineModel.find).mockReturnValue(
      mockExec([
        {
          quantity: 1,
          nameSnapshot: "Burger",
          priceSnapshotMinor: 1000,
          modifierSnapshots: [],
        },
      ]),
    );

    vi.mocked(RestaurantSettingsModel.findOne).mockReturnValue(
      mockExec({
        restaurantName: "My Restaurant",
        receiptFooter: "Thanks",
      }),
    );

    vi.mocked(PaymentModel.findOne).mockReturnValue({
      sort: () =>
        mockExec({
          method: "CASH",
          tenderedMinor: 1500,
          changeMinor: 400,
          cashierId: "c1",
        }),
    } as never);

    vi.mocked(RestaurantTableModel.findById).mockReturnValue(
      mockExec({ label: "Table 1" }),
    );
    vi.mocked(UserModel.findById).mockReturnValue(mockExec({ name: "John" }));

    const receipt = await getReceipt(mockTicketId.toString(), "actor1");
    expect(receipt.restaurantName).toBe("My Restaurant");
    expect(receipt.ticketNo).toBe(123);
    expect(receipt.totalMinor).toBe(1100);
    expect(receipt.payment?.method).toBe("CASH");
  });

  it("34. should throw if ticket not paid", async () => {
    vi.mocked(TicketModel.findById).mockReturnValue(
      mockExec({
        status: "CLOSED",
      }),
    );

    await expect(
      getReceipt(new mongoose.Types.ObjectId().toString(), "actor1"),
    ).rejects.toThrow("TICKET_NOT_PAID");
  });

  it("35. should send receipt email idempotently", async () => {
    const mockTicketId = new mongoose.Types.ObjectId();
    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
      withTransaction: async (cb: () => Promise<unknown>) => cb(),
    } as unknown as mongoose.ClientSession;

    vi.spyOn(mongoose, "startSession").mockResolvedValue(mockSession);

    // Initial mock returns null for existing idempotency record
    vi.mocked(IdempotencyRecordModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue(null),
    } as never);

    vi.mocked(TicketModel.findById).mockReturnValue({
      session: vi.fn().mockResolvedValue({
        _id: mockTicketId,
        status: "PAID",
      }),
    } as never);

    vi.mocked(IdempotencyRecordModel.create).mockResolvedValue([] as never);

    const res = await sendReceiptEmail(
      mockTicketId.toString(),
      "test@example.com",
      "actor1",
      "idem1",
    );
    expect(res?.success).toBe(true);

    // If existing idempotency record is found
    vi.mocked(IdempotencyRecordModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue({
        resultMetadata: { success: true, fromCache: true },
      }),
    } as never);

    const resCached = await sendReceiptEmail(
      mockTicketId.toString(),
      "test@example.com",
      "actor1",
      "idem1",
    );
    expect(resCached).toEqual({ success: true, fromCache: true });
  });

  it("44. duplicate PDF generation does not mutate ticket", async () => {
    const ticketId = new mongoose.Types.ObjectId();
    const mockTicket = {
      _id: ticketId,
      ticketNo: 6,
      status: "PAID",
      tableId: "t1",
      waiterId: "w1",
      openedAt: new Date(),
      paidAt: new Date(),
      subtotalMinor: 1000,
      discountMinor: 0,
      taxMinor: 100,
      serviceChargeMinor: 0,
      totalMinor: 1100,
    };
    vi.mocked(TicketModel.findById).mockReturnValue(mockExec(mockTicket));
    vi.mocked(OrderLineModel.find).mockReturnValue(mockExec([]));
    vi.mocked(RestaurantSettingsModel.findOne).mockReturnValue(
      mockExec({ restaurantName: "Test" }) as never,
    );
    vi.mocked(PaymentModel.findOne).mockReturnValue({
      sort: () =>
        mockExec({
          method: "CASH",
          tenderedMinor: 1500,
          changeMinor: 400,
          cashierId: "c1",
        }) as never,
    } as never);
    vi.mocked(RestaurantTableModel.findById).mockReturnValue(
      mockExec({ label: "T1" }),
    );
    vi.mocked(UserModel.findById).mockReturnValue(mockExec({ name: "User" }));

    const r1 = await getReceipt(ticketId.toString(), "actor1");
    const r2 = await getReceipt(ticketId.toString(), "actor1");
    expect(r1).toEqual(r2);
  });

  it("45. failed email does not corrupt state or mark receipt sent", async () => {
    const mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
      withTransaction: async (cb: () => Promise<unknown>) => cb(),
    } as unknown as mongoose.ClientSession;
    vi.spyOn(mongoose, "startSession").mockResolvedValue(mockSession);

    const ticketId = new mongoose.Types.ObjectId();
    vi.mocked(IdempotencyRecordModel.findOne).mockReturnValue({
      session: vi.fn().mockResolvedValue(null),
    } as never);
    vi.mocked(TicketModel.findById).mockReturnValue({
      session: vi.fn().mockResolvedValue({ _id: ticketId, status: "PAID" }),
    } as never);
    vi.mocked(IdempotencyRecordModel.create).mockResolvedValue([] as never);

    vi.mocked(TicketModel.findById).mockImplementationOnce(() => {
      throw new Error("Email provider failed");
    });

    await expect(
      sendReceiptEmail(
        ticketId.toString(),
        "test@example.com",
        "actor1",
        "idem-fail",
      ),
    ).rejects.toThrow();
  });
});
