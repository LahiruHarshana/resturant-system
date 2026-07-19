import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";
import { getSettings, updateSettings } from "@/server/admin/settings-service";
import mongoose from "mongoose";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Admin Core - Settings", () => {
  beforeEach(async () => {
    await startIntegrationDatabase();

    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      permissions: new Set(),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    await RestaurantSettingsModel.create({
      key: "default",
      currency: "USD",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 10,
      urgentAgingMinutes: 20,
      readySoundEnabled: true,
      restaurantName: "My Restaurant",
      serviceChargeBps: 0,
      taxBps: 0,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
    await stopIntegrationDatabase();
  });

  it("30. should update valid settings", async () => {
    const res = await updateSettings({
      currency: "LKR",
      currencyMinorDigits: 2,
      kitchenAgingMinutes: 15,
      urgentAgingMinutes: 30,
      readySoundEnabled: false,
      receiptFooter: "Thanks",
      restaurantName: "Test Restaurant",
      restaurantAddress: "123 Test St",
      restaurantPhone: "123-456",
      restaurantEmail: "test@example.com",
      serviceChargeBps: 1000,
      taxBps: 500,
    });

    expect(res.success).toBe(true);

    const settings = await getSettings();
    expect(settings.currency).toBe("LKR");
    expect(settings.kitchenAgingMinutes).toBe(15);
    expect(settings.serviceChargeBps).toBe(1000);
  });

  it("31. should reject invalid urgent aging configuration", async () => {
    await expect(
      updateSettings({
        currency: "USD",
        currencyMinorDigits: 2,
        kitchenAgingMinutes: 30,
        urgentAgingMinutes: 10, // Must be > kitchen
        readySoundEnabled: true,
        restaurantName: "My Restaurant",
        serviceChargeBps: 0,
        taxBps: 0,
      }),
    ).rejects.toThrow(
      /urgentAgingMinutes must be greater than kitchenAgingMinutes/,
    );
  });

  it("32. should reject invalid currency code", async () => {
    await expect(
      updateSettings({
        currency: "US", // Must be 3 chars
        currencyMinorDigits: 2,
        kitchenAgingMinutes: 10,
        urgentAgingMinutes: 20,
        readySoundEnabled: true,
        restaurantName: "My Restaurant",
        serviceChargeBps: 0,
        taxBps: 0,
      }),
    ).rejects.toThrow();
  });
});
