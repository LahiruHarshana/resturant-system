import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import mongoose from "mongoose";
import { startIntegrationDatabase } from "../support/database";
import { addOrderLines } from "@/server/waiter/order-service";
import { TicketModel } from "@/server/db/models/ticket.model";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { StationModel } from "@/server/db/models/station.model";
import { MenuCategoryModel } from "@/server/db/models/menu-category.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { ZoneModel } from "@/server/db/models/zone.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Waiter Order Composer Service", () => {
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
  });

  it("should calculate correct totals with modifiers, tax, and service charge", async () => {
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      permissions: new Set(["order:update"]),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    await RestaurantSettingsModel.create({
      key: "default",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 10,
      urgentAgingMinutes: 20,
      serviceChargeBps: 1000, // 10%
      taxBps: 500, // 5%
    });

    const station = await StationModel.create({
      name: "Hot",
      type: "KITCHEN",
      isActive: true,
    });
    const category = await MenuCategoryModel.create({
      name: "Mains",
      isActive: true,
    });
    const table = await RestaurantTableModel.create({
      label: "T1",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });

    const ticket = await TicketModel.create({
      ticketNo: 1,
      tableId: table._id,
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      guestCount: 2,
    });

    const item = await MenuItemModel.create({
      categoryId: category._id,
      stationId: station._id,
      name: "Burger",
      isAvailable: true,
      priceMinor: 1000, // $10.00
      modifiers: [
        {
          name: "Cheese",
          minSelections: 1,
          maxSelections: 1,
          options: [{ name: "Cheddar", priceDeltaMinor: 150 }], // $1.50
        },
      ],
    });

    const result = await addOrderLines(ticket._id.toString(), {
      idempotencyKey: "test-fire-1",
      lines: [
        {
          menuItemId: item._id.toString(),
          quantity: 2,
          note: "",
          modifierSelections: [{ groupName: "Cheese", optionName: "Cheddar" }],
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.lines.length).toBe(1);

    // subtotal = (1000 + 150) * 2 = 2300
    // tax = 2300 * 5% = 115
    // serviceCharge = 2300 * 10% = 230
    // total = 2300 + 115 + 230 = 2645
    expect(result.ticket.subtotalMinor).toBe(2300);
    expect(result.ticket.taxMinor).toBe(115);
    expect(result.ticket.serviceChargeMinor).toBe(230);
    expect(result.ticket.totalMinor).toBe(2645);
  });

  it("should reject if required modifier is missing", async () => {
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      permissions: new Set(["order:update"]),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);
    const station = await StationModel.create({ name: "Hot", type: "KITCHEN" });
    const category = await MenuCategoryModel.create({ name: "Mains" });
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
      status: "OPEN",
      guestCount: 2,
    });

    const item = await MenuItemModel.create({
      categoryId: category._id,
      stationId: station._id,
      name: "Burger",
      isAvailable: true,
      priceMinor: 1000,
      modifiers: [
        {
          name: "Cheese",
          minSelections: 1,
          maxSelections: 1,
          options: [{ name: "Cheddar", priceDeltaMinor: 150 }],
        },
      ],
    });

    await expect(
      addOrderLines(ticket._id.toString(), {
        idempotencyKey: "test-fire-2",
        lines: [
          {
            menuItemId: item._id.toString(),
            quantity: 1,
            note: "",
            modifierSelections: [], // Missing required!
          },
        ],
      }),
    ).rejects.toThrow("Not enough selections for modifier group Cheese");
  });

  it("should be idempotent and return same result on duplicate submit", async () => {
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      permissions: new Set(["order:update"]),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);
    const station = await StationModel.create({ name: "Hot", type: "KITCHEN" });
    const category = await MenuCategoryModel.create({ name: "Mains" });
    const table = await RestaurantTableModel.create({
      label: "T1",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });

    const ticket = await TicketModel.create({
      ticketNo: 3,
      tableId: table._id,
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      guestCount: 1,
    });
    const item = await MenuItemModel.create({
      categoryId: category._id,
      stationId: station._id,
      name: "Coke",
      priceMinor: 200,
    });

    const req = {
      idempotencyKey: "idem-key-123",
      lines: [
        {
          menuItemId: item._id.toString(),
          quantity: 1,
          note: "",
          modifierSelections: [],
        },
      ],
    };

    const res1 = await addOrderLines(ticket._id.toString(), req);
    const res2 = await addOrderLines(ticket._id.toString(), req);

    expect(res1.lines.length).toBe(1);
    expect(res2.lines.length).toBe(1);
    expect(res1.ticket.totalMinor).toBe(200);
    expect(res2.ticket.totalMinor).toBe(200);
  });
});
