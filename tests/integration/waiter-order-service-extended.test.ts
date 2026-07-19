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
import { OrderLineModel } from "@/server/db/models/order-line.model";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Waiter Order Composer - Extended Evidence Verifications", () => {
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
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      permissions: new Set(["order:update"]),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);
  });

  const setupBasicData = async () => {
    const station = await StationModel.create({ name: "Hot", type: "KITCHEN" });
    const category = await MenuCategoryModel.create({ name: "Mains" });
    const table = await RestaurantTableModel.create({
      label: "T1",
      seats: 2,
      zone: "Main",
      status: "OCCUPIED",
    });
    const ticket = await TicketModel.create({
      ticketNo: 99,
      tableId: table._id,
      waiterId: new mongoose.Types.ObjectId(),
      status: "OPEN",
      guestCount: 2,
    });
    return { station, category, table, ticket };
  };

  describe("Modifier validation with executable test evidence", () => {
    it("proves required modifier group must be satisfied", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
        priceMinor: 1000,
        modifiers: [
          {
            name: "Cheese",
            minSelections: 1,
            maxSelections: 1,
            options: [{ name: "Cheddar", priceDeltaMinor: 100 }],
          },
        ],
      });
      await expect(
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "req-mod-1",
          lines: [
            {
              menuItemId: item._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [],
            },
          ],
        }),
      ).rejects.toThrow("Not enough selections for modifier group Cheese");
    });

    it("proves optional modifier group may be empty", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
        priceMinor: 1000,
        modifiers: [
          {
            name: "Bacon",
            minSelections: 0,
            maxSelections: 1,
            options: [{ name: "Add Bacon", priceDeltaMinor: 200 }],
          },
        ],
      });
      const res = await addOrderLines(ticket._id.toString(), {
        idempotencyKey: "opt-mod-1",
        lines: [
          {
            menuItemId: item._id.toString(),
            quantity: 1,
            note: "",
            modifierSelections: [],
          },
        ],
      });
      expect(res.success).toBe(true);
    });

    it("proves modifier min selection is enforced", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
        priceMinor: 1000,
        modifiers: [
          {
            name: "Cheese",
            minSelections: 2,
            maxSelections: 3,
            options: [
              { name: "Cheddar", priceDeltaMinor: 0 },
              { name: "Swiss", priceDeltaMinor: 0 },
            ],
          },
        ],
      });
      await expect(
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "min-mod-1",
          lines: [
            {
              menuItemId: item._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [
                { groupName: "Cheese", optionName: "Cheddar" },
              ],
            },
          ],
        }),
      ).rejects.toThrow("Not enough selections for modifier group Cheese");
    });

    it("proves modifier max selection is enforced", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
        priceMinor: 1000,
        modifiers: [
          {
            name: "Cheese",
            minSelections: 1,
            maxSelections: 1,
            options: [
              { name: "Cheddar", priceDeltaMinor: 0 },
              { name: "Swiss", priceDeltaMinor: 0 },
            ],
          },
        ],
      });
      await expect(
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "max-mod-1",
          lines: [
            {
              menuItemId: item._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [
                { groupName: "Cheese", optionName: "Cheddar" },
                { groupName: "Cheese", optionName: "Swiss" },
              ],
            },
          ],
        }),
      ).rejects.toThrow("Too many selections for modifier group Cheese");
    });

    it("proves unknown modifier option is rejected", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
        priceMinor: 1000,
        modifiers: [
          {
            name: "Cheese",
            minSelections: 1,
            maxSelections: 1,
            options: [{ name: "Cheddar", priceDeltaMinor: 0 }],
          },
        ],
      });
      await expect(
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "unk-mod-1",
          lines: [
            {
              menuItemId: item._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [
                { groupName: "Cheese", optionName: "Swiss" },
              ],
            },
          ],
        }),
      ).rejects.toThrow("Invalid modifier selection");
    });

    it("proves modifier from another item is rejected", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
        priceMinor: 1000,
        modifiers: [],
      });
      await expect(
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "diff-mod-1",
          lines: [
            {
              menuItemId: item._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [
                { groupName: "Cheese", optionName: "Cheddar" },
              ],
            },
          ],
        }),
      ).rejects.toThrow("Invalid modifier selection");
    });

    it("proves duplicate modifier option selection is rejected", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
        priceMinor: 1000,
        modifiers: [
          {
            name: "Cheese",
            minSelections: 1,
            maxSelections: 2,
            options: [{ name: "Cheddar", priceDeltaMinor: 0 }],
          },
        ],
      });
      await expect(
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "dup-mod-1",
          lines: [
            {
              menuItemId: item._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [
                { groupName: "Cheese", optionName: "Cheddar" },
                { groupName: "Cheese", optionName: "Cheddar" },
              ],
            },
          ],
        }),
      ).rejects.toThrow("Duplicate modifier selection");
    });

    it("proves modifier price delta is snapshotted from the server", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
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
      await addOrderLines(ticket._id.toString(), {
        idempotencyKey: "snap-mod-1",
        lines: [
          {
            menuItemId: item._id.toString(),
            quantity: 1,
            note: "",
            modifierSelections: [
              { groupName: "Cheese", optionName: "Cheddar" },
            ],
          },
        ],
      });
      const orderLine = await OrderLineModel.findOne({ ticketId: ticket._id });
      expect(orderLine!.modifierSnapshots[0]!.priceDeltaMinor).toBe(150);
    });
  });

  describe("Authoritative server-side payload handling", () => {
    it("proves persisted records ignore/reject client-supplied malicious payloads", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Steak",
        priceMinor: 5000,
        modifiers: [
          {
            name: "Doneness",
            minSelections: 1,
            maxSelections: 1,
            options: [{ name: "Medium", priceDeltaMinor: 100 }],
          },
        ],
      });

      const payload = {
        idempotencyKey: "malicious-1",
        lines: [
          {
            menuItemId: item._id.toString(),
            quantity: 1,
            note: "Malicious note",
            modifierSelections: [
              {
                groupName: "Doneness",
                optionName: "Medium",
                // Malicious fields injected into modifiers
                nameSnapshot: "Fake Doneness",
                priceDeltaMinor: 0,
              },
            ],
            // Malicious fields injected to bypass authority
            nameSnapshot: "Lobster", // Fake name
            priceSnapshotMinor: 100, // Fake price
            stationId: "fake-station",
            stationTypeSnapshot: "BAR",
            status: "READY",
            waiterId: "fake-waiter",
          },
        ],
        subtotalMinor: 100,
        totalMinor: 100,
        waiterId: "fake-waiter",
      } as unknown as Parameters<typeof addOrderLines>[1];

      await addOrderLines(ticket._id.toString(), payload);

      const line = await OrderLineModel.findOne({ ticketId: ticket._id });
      // Asserts:
      // - nameSnapshot comes from MenuItem (ignored client payload)
      expect(line!.nameSnapshot).toBe("Steak");
      // - priceSnapshotMinor comes from MenuItem
      expect(line!.priceSnapshotMinor).toBe(5000);
      // - modifier names come from MenuItem modifier config
      expect(line!.modifierSnapshots[0]!.nameSnapshot).toBe("Doneness: Medium");
      // - modifier price deltas come from MenuItem modifier config
      expect(line!.modifierSnapshots[0]!.priceDeltaMinor).toBe(100);
      // - stationId comes from MenuItem
      expect(line!.stationId.toString()).toBe(station._id.toString());
      // - stationTypeSnapshot comes from authoritative Station/MenuItem data
      expect(line!.stationTypeSnapshot).toBe("KITCHEN");
      // - order-line status is server-defined
      expect(line!.status).toBe("NEW");

      const t = await TicketModel.findById(ticket._id);
      // - ticket subtotal is server-calculated
      expect(t!.subtotalMinor).toBe(5100);
      // - ticket total is server-calculated
      expect(t!.totalMinor).toBe(5100);
      // - waiterId is not accepted from the client
      expect(t!.waiterId.toString()).toBe(ticket.waiterId.toString());
    });
  });

  describe("Snapshot immutability", () => {
    it("proves after MenuItem name/price edit, existing OrderLine snapshot remains unchanged", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Fries",
        priceMinor: 300,
      });

      await addOrderLines(ticket._id.toString(), {
        idempotencyKey: "snap-1",
        lines: [
          {
            menuItemId: item._id.toString(),
            quantity: 1,
            note: "",
            modifierSelections: [],
          },
        ],
      });

      // Update menu item
      await MenuItemModel.findByIdAndUpdate(item._id, {
        name: "Truffle Fries",
        priceMinor: 600,
      });

      // Fetch order line
      const line = await OrderLineModel.findOne({ ticketId: ticket._id });
      expect(line!.nameSnapshot).toBe("Fries"); // Remains unchanged
      expect(line!.priceSnapshotMinor).toBe(300); // Remains unchanged
    });

    it("proves after modifier config edit, existing OrderLine modifier snapshot remains unchanged", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
        priceMinor: 1000,
        modifiers: [
          {
            name: "Cheese",
            minSelections: 1,
            maxSelections: 1,
            options: [{ name: "Cheddar", priceDeltaMinor: 100 }],
          },
        ],
      });

      await addOrderLines(ticket._id.toString(), {
        idempotencyKey: "snap-2",
        lines: [
          {
            menuItemId: item._id.toString(),
            quantity: 1,
            note: "",
            modifierSelections: [
              { groupName: "Cheese", optionName: "Cheddar" },
            ],
          },
        ],
      });

      // Update modifier
      await MenuItemModel.findByIdAndUpdate(item._id, {
        modifiers: [
          {
            name: "Cheese",
            minSelections: 1,
            maxSelections: 1,
            options: [{ name: "Cheddar", priceDeltaMinor: 500 }],
          },
        ],
      });

      const line = await OrderLineModel.findOne({ ticketId: ticket._id });
      expect(line!.modifierSnapshots[0]!.priceDeltaMinor).toBe(100); // Remains unchanged
    });
  });

  describe("Ticket status restrictions", () => {
    it("proves line additions are rejected for CLOSED ticket", async () => {
      const { station, category, ticket } = await setupBasicData();
      await TicketModel.findByIdAndUpdate(ticket._id, { status: "CLOSED" });
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Fries",
        priceMinor: 300,
      });

      await expect(
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "stat-1",
          lines: [
            {
              menuItemId: item._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [],
            },
          ],
        }),
      ).rejects.toThrow("Only OPEN tickets can be modified");
    });

    it("proves line additions are rejected for PAID ticket", async () => {
      const { station, category, ticket } = await setupBasicData();
      await TicketModel.findByIdAndUpdate(ticket._id, { status: "PAID" });
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Fries",
        priceMinor: 300,
      });

      await expect(
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "stat-2",
          lines: [
            {
              menuItemId: item._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [],
            },
          ],
        }),
      ).rejects.toThrow("Only OPEN tickets can be modified");
    });

    it("proves line additions are rejected for CANCELLED ticket", async () => {
      const { station, category, ticket } = await setupBasicData();
      await TicketModel.findByIdAndUpdate(ticket._id, { status: "CANCELLED" });
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Fries",
        priceMinor: 300,
      });

      await expect(
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "stat-3",
          lines: [
            {
              menuItemId: item._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [],
            },
          ],
        }),
      ).rejects.toThrow("Only OPEN tickets can be modified");
    });
  });

  describe("Money and totals", () => {
    it("proves all persisted money is integer minor units, no floating-point", async () => {
      await RestaurantSettingsModel.create({
        key: "default",
        currency: "USD",
        currencyMinorDigits: 2,
        serviceChargeBps: 1000,
        taxBps: 500,
        kitchenAgingMinutes: 10,
        urgentAgingMinutes: 20,
      });
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Pizza",
        priceMinor: 1555,
      });

      await addOrderLines(ticket._id.toString(), {
        idempotencyKey: "mon-1",
        lines: [
          {
            menuItemId: item._id.toString(),
            quantity: 3,
            note: "",
            modifierSelections: [],
          },
        ],
      });

      const t = await TicketModel.findById(ticket._id);
      expect(t!.subtotalMinor).toBe(4665); // 1555 * 3
      expect(t!.serviceChargeMinor).toBe(467); // 4665 * 0.1 = 466.5 -> rounded 467
      expect(t!.taxMinor).toBe(233); // 4665 * 0.05 = 233.25 -> rounded 233
      expect(t!.totalMinor).toBe(4665 + 467 + 233);
      expect(Number.isInteger(t!.subtotalMinor)).toBe(true);
      expect(Number.isInteger(t!.totalMinor)).toBe(true);
    });
  });

  describe("Duplicate-submit and concurrency", () => {
    it("proves duplicate rapid submit creates only one line", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Fries",
        priceMinor: 300,
      });

      const payload = {
        idempotencyKey: "rapid-dup-1",
        lines: [
          {
            menuItemId: item._id.toString(),
            quantity: 1,
            note: "",
            modifierSelections: [],
          },
        ],
      };

      await Promise.all([
        addOrderLines(ticket._id.toString(), payload),
        addOrderLines(ticket._id.toString(), payload),
        addOrderLines(ticket._id.toString(), payload),
      ]);

      const lines = await OrderLineModel.find({ ticketId: ticket._id });
      expect(lines.length).toBe(1);
    });

    it("proves concurrent valid line additions keep totals consistent", async () => {
      const { station, category, ticket } = await setupBasicData();
      const item1 = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Fries",
        priceMinor: 300,
      });
      const item2 = await MenuItemModel.create({
        categoryId: category._id,
        stationId: station._id,
        name: "Burger",
        priceMinor: 1000,
      });

      await Promise.all([
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "conc-1",
          lines: [
            {
              menuItemId: item1._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [],
            },
          ],
        }),
        addOrderLines(ticket._id.toString(), {
          idempotencyKey: "conc-2",
          lines: [
            {
              menuItemId: item2._id.toString(),
              quantity: 1,
              note: "",
              modifierSelections: [],
            },
          ],
        }),
      ]);

      const lines = await OrderLineModel.find({ ticketId: ticket._id });
      expect(lines.length).toBe(2);

      const t = await TicketModel.findById(ticket._id);
      expect(t!.subtotalMinor).toBe(1300); // 300 + 1000. No lost updates.
    });
  });
});
