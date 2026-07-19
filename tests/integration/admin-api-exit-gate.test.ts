import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  startIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import * as authorization from "@/server/auth/authorization";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

// Import Route Handlers
import { POST as createStation } from "@/app/api/admin/stations/route";
import { POST as createCategory } from "@/app/api/admin/categories/route";
import { POST as createMenuItem } from "@/app/api/admin/menu-items/route";
import { POST as createZone } from "@/app/api/admin/zones/route";
import { POST as createTable } from "@/app/api/admin/tables/route";
import { POST as createRole } from "@/app/api/admin/roles/route";
import {
  POST as createUser,
  GET as getUsers,
} from "@/app/api/admin/users/route";
import { PUT as updateSettings } from "@/app/api/admin/settings/route";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Admin Core - API Exit Gate & Credential Safety", () => {
  let adminId: string;

  beforeEach(async () => {
    await startIntegrationDatabase();

    adminId = new mongoose.Types.ObjectId().toString();

    // Mock authorization to simulate Super Admin
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: adminId,
      permissions: new Set([
        "menu:manage",
        "table:manage",
        "role:manage",
        "user:manage",
        "settings:manage",
      ]),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    // Seed default settings required for updates and menu price conversion
    const { RestaurantSettingsModel } =
      await import("@/server/db/models/restaurant-settings.model");
    await RestaurantSettingsModel.create({
      key: "default",
      restaurantName: "Demo Restaurant",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 15,
      urgentAgingMinutes: 30,
      readySoundEnabled: true,
      receiptFooter: "Default Footer",
      serviceChargeBps: 1000,
      taxBps: 800,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
  });

  function createMockRequest(body: unknown) {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  }

  it("should complete the full admin configuration flow via Route Handlers", async () => {
    // 1. Update restaurant settings (required for menu item price conversions)
    const settingsReq = createMockRequest({
      restaurantName: "Demo Restaurant",
      currency: "USD",
      currencyMinorDigits: 2,
      serviceChargeBps: 100,
      taxBps: 800,
      kitchenAgingMinutes: 10,
      urgentAgingMinutes: 20,
      receiptFooter: "Enjoy!",
      readySoundEnabled: true,
    });
    const settingsRes = await updateSettings(settingsReq);
    expect(settingsRes.status).toBe(200);

    // 2. Create a station
    const stationReq = createMockRequest({
      name: "Kitchen Test Station",
      type: "KITCHEN",
      isActive: true,
    });
    const stationRes = await createStation(stationReq);
    const stationData = await stationRes.json();
    expect(stationRes.status).toBe(201);
    expect(stationData.stationId).toBeDefined();

    // 3. Create a category
    const categoryReq = createMockRequest({
      name: "Main Course",
      sortOrder: 1,
      isActive: true,
    });
    const categoryRes = await createCategory(categoryReq);
    const categoryData = await categoryRes.json();
    expect(categoryRes.status).toBe(201);
    expect(categoryData.categoryId).toBeDefined();

    // 4. Create a menu item with modifiers
    const menuItemReq = createMockRequest({
      categoryId: categoryData.categoryId,
      stationId: stationData.stationId,
      name: "Burger",
      priceMajor: "10.00",
      isAvailable: true,
      sortOrder: 1,
      modifiers: [
        {
          name: "Addons",
          minSelections: 0,
          maxSelections: 1,
          options: [
            {
              name: "Cheese",
              priceDeltaMajor: "1.00",
              isAvailable: true,
              sortOrder: 0,
            },
          ],
        },
      ],
    });
    const menuItemRes = await createMenuItem(menuItemReq);
    expect(menuItemRes.status).toBe(201);

    // 5. Create a zone and table
    const zoneReq = createMockRequest({
      name: "Indoor",
      isActive: true,
      sortOrder: 1,
    });
    const zoneRes = await createZone(zoneReq);
    expect(zoneRes.status).toBe(201);

    const tableReq = createMockRequest({
      label: "Table 1",
      seats: 4,
      zone: "Indoor",
    });
    const tableRes = await createTable(tableReq);
    expect(tableRes.status).toBe(201);

    // 6. Create a custom role
    const roleReq = createMockRequest({
      name: "custom_role",
      description: "Custom role",
      permissions: ["order:read"],
    });
    const roleRes = await createRole(roleReq);
    expect(roleRes.status).toBe(201);
    const roleData = await roleRes.json();
    const mockRoleId = roleData.roleId;

    // 7. Create a user and assign multiple roles
    const userReq = createMockRequest({
      name: "Test User",
      email: "test_gate@example.com",
      phone: "",
      roles: [mockRoleId],
      pinEnabled: true,
      isActive: true,
    });
    const userRes = await createUser(userReq);
    expect(userRes.status).toBe(201);
  });

  it("should never return passwordHash or pinHash in user list endpoint", async () => {
    // We need a valid role for the user
    const roleReq = createMockRequest({
      name: "safety_role",
      description: "Role for safety test",
      permissions: [],
    });
    const roleRes = await createRole(roleReq);
    const roleData = await roleRes.json();
    const safetyRoleId = roleData.roleId;

    // First create a user with pin enabled
    const userReq = createMockRequest({
      name: "Credential Safety User",
      email: "safety@example.com",
      phone: "",
      roles: [safetyRoleId],
      pinEnabled: true,
      isActive: true,
    });
    const userRes = await createUser(userReq);
    const createData = await userRes.json();
    console.log("User Create Error:", userRes.status, createData);
    expect(userRes.status).toBe(201);

    // Ensure temp passwords were returned ONLY in the create response
    expect(createData.tempPassword).toBeDefined();
    expect(createData.tempPin).toBeDefined();
    expect(createData.passwordHash).toBeUndefined();
    expect(createData.pinHash).toBeUndefined();

    // Fetch user list
    const listRes = await getUsers();
    expect(listRes.status).toBe(200);
    const users = await listRes.json();

    const safetyUser = users.find(
      (u: { email: string }) => u.email === "safety@example.com",
    );
    expect(safetyUser).toBeDefined();

    // Ensure temp credentials are NEVER returned in subsequent API calls
    expect(safetyUser.tempPassword).toBeUndefined();
    expect(safetyUser.tempPin).toBeUndefined();

    // Ensure hashes are NEVER returned
    expect(safetyUser.passwordHash).toBeUndefined();
    expect(safetyUser.pinHash).toBeUndefined();
  });
});
