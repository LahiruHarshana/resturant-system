import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import { startIntegrationDatabase } from "../support/database";
import { getCompactMenu } from "@/server/waiter/menu-service";
import { MenuCategoryModel } from "@/server/db/models/menu-category.model";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { StationModel } from "@/server/db/models/station.model";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Waiter Menu Query Service", () => {
  beforeAll(async () => {
    await startIntegrationDatabase();
  });

  beforeEach(async () => {
    await MenuCategoryModel.deleteMany({});
    await MenuItemModel.deleteMany({});
    await StationModel.deleteMany({});
  });

  it("should return compact menu items with correct active/available filters", async () => {
    // Authenticated waiter with table:read permission
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: "user1",
      permissions: new Set(["table:read"]),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    const activeCat = await MenuCategoryModel.create({
      name: "Active Cat",
      isActive: true,
      sortOrder: 1,
    });
    const inactiveCat = await MenuCategoryModel.create({
      name: "Inactive Cat",
      isActive: false,
      sortOrder: 2,
    });

    const activeStation = await StationModel.create({
      name: "Hot",
      type: "KITCHEN",
      isActive: true,
    });
    const inactiveStation = await StationModel.create({
      name: "Bar",
      type: "BAR",
      isActive: false,
    });

    // Valid item
    await MenuItemModel.create({
      categoryId: activeCat._id,
      stationId: activeStation._id,
      name: "Valid Item",
      isAvailable: true,
      priceMinor: 1000,
    });

    // Unavailable item
    await MenuItemModel.create({
      categoryId: activeCat._id,
      stationId: activeStation._id,
      name: "Unavailable Item",
      isAvailable: false,
      priceMinor: 1000,
    });

    // Item in inactive category
    await MenuItemModel.create({
      categoryId: inactiveCat._id,
      stationId: activeStation._id,
      name: "Inactive Cat Item",
      isAvailable: true,
      priceMinor: 1000,
    });

    // Item in inactive station
    await MenuItemModel.create({
      categoryId: activeCat._id,
      stationId: inactiveStation._id,
      name: "Inactive Station Item",
      isAvailable: true,
      priceMinor: 1000,
    });

    const menu = await getCompactMenu();

    expect(menu.categories.length).toBe(1);
    expect(menu.categories[0]?.name).toBe("Active Cat");

    expect(menu.items.length).toBe(1);
    expect(menu.items[0]?.name).toBe("Valid Item");
    expect(menu.items[0]?.priceMinor).toBe(1000);
    expect(menu.items[0]).not.toHaveProperty("isAvailable"); // Excluded from DTO
  });
});
