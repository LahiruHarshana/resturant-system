import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { MenuCategoryModel } from "@/server/db/models/menu-category.model";
import { StationModel } from "@/server/db/models/station.model";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
} from "@/server/admin/menu-item-service";
import mongoose from "mongoose";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Admin Core - Menu Items", () => {
  let categoryId: string;
  let stationId: string;

  beforeEach(async () => {
    await startIntegrationDatabase();

    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      permissions: new Set(),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    // Setup base data
    await RestaurantSettingsModel.create({
      key: "default",
      currency: "LKR",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 15,
      urgentAgingMinutes: 30,
      readySoundEnabled: true,
      serviceChargeBps: 1000,
      taxBps: 500,
    });

    const category = await MenuCategoryModel.create({ name: "Mains" });
    categoryId = category._id.toString();

    const station = await StationModel.create({
      name: "Kitchen",
      type: "KITCHEN",
    });
    stationId = station._id.toString();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
    await stopIntegrationDatabase();
  });

  it("11. should create a valid menu item and convert price properly", async () => {
    const res = await createMenuItem({
      name: "Burger",
      description: "Beef burger",
      imageUrl: "",
      categoryId,
      stationId,
      priceMajor: "12.50",
      isAvailable: true,
      sortOrder: 1,
      modifiers: [
        {
          name: "Add-ons",
          minSelections: 0,
          maxSelections: 2,
          options: [
            { name: "Cheese", priceDeltaMajor: "1.50" },
            { name: "Bacon", priceDeltaMajor: "2.00" },
          ],
        },
      ],
    });

    expect(res.success).toBe(true);

    const item = await MenuItemModel.findById(res.itemId);
    expect(item?.name).toBe("Burger");
    expect(item?.priceMinor).toBe(1250); // 12.50 * 100
    expect(item?.modifiers[0]!.options[0]!.priceDeltaMinor).toBe(150);
  });

  it("12. should reject invalid prices or modifier configurations", async () => {
    await expect(
      createMenuItem({
        name: "Burger",
        description: "",
        imageUrl: "",
        categoryId,
        stationId,
        priceMajor: "abc", // Invalid decimal
        isAvailable: true,
        sortOrder: 1,
        modifiers: [],
      }),
    ).rejects.toThrow();

    await expect(
      createMenuItem({
        name: "Burger",
        description: "",
        imageUrl: "",
        categoryId,
        stationId,
        priceMajor: "10.00",
        isAvailable: true,
        sortOrder: 1,
        modifiers: [
          {
            name: "Size",
            minSelections: 0,
            maxSelections: 1,
            options: [], // Zod requires at least 1 option
          },
        ],
      }),
    ).rejects.toThrow();
  });

  it("13. should edit a menu item", async () => {
    const createRes = await createMenuItem({
      name: "Old Name",
      description: "",
      imageUrl: "",
      categoryId,
      stationId,
      priceMajor: "10.00",
      isAvailable: true,
      sortOrder: 1,
      modifiers: [],
    });

    await updateMenuItem(createRes ? createRes.itemId : "id", {
      name: "New Name",
      description: "",
      imageUrl: "",
      categoryId,
      stationId,
      priceMajor: "15.00",
      isAvailable: true,
      sortOrder: 1,
      modifiers: [],
    });

    const updated = await MenuItemModel.findById(createRes.itemId);
    expect(updated?.name).toBe("New Name");
    expect(updated?.priceMinor).toBe(1500);
  });

  it("14. should format output properly using minorToDisplay", async () => {
    await createMenuItem({
      name: "Burger",
      description: "",
      imageUrl: "",
      categoryId,
      stationId,
      priceMajor: "12.50",
      isAvailable: true,
      sortOrder: 1,
      modifiers: [
        {
          name: "Add-ons",
          minSelections: 0,
          maxSelections: 1,
          options: [{ name: "Cheese", priceDeltaMajor: "1.50" }],
        },
      ],
    });

    const items = await getMenuItems();
    expect(items[0]!.priceMajor).toBe("12.50");
    expect(items[0]!.modifiers![0]!.options![0]!.priceDeltaMajor).toBe("1.50");
  });
});
