import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { StationModel } from "@/server/db/models/station.model";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import {
  getStations,
  createStation,
  updateStation,
  deactivateStation,
  deleteStation,
} from "@/server/admin/station-service";
import mongoose from "mongoose";
import * as authorization from "@/server/auth/authorization";
import { MenuCategoryModel } from "@/server/db/models/menu-category.model";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Admin Core - Stations", () => {
  beforeEach(async () => {
    await startIntegrationDatabase();

    // Mock requirePermission to simulate an authorized admin
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      permissions: new Set(),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
    await stopIntegrationDatabase();
  });

  it("1. should create a valid station and audit the action", async () => {
    const res = await createStation({
      name: "Main Kitchen",
      type: "KITCHEN",
      isActive: true,
      sortOrder: 1,
    });

    expect(res.success).toBe(true);
    expect(res.stationId).toBeDefined();

    const station = await StationModel.findById(res.stationId);
    expect(station?.name).toBe("Main Kitchen");
    expect(station?.type).toBe("KITCHEN");

    const audit = await AuditLogModel.findOne({ action: "CREATE_STATION" });
    expect(audit).toBeDefined();
    expect(audit?.entity).toBe("Station");
  });

  it("2. should reject an invalid type (enforced by Zod and Mongoose)", async () => {
    await expect(
      createStation({
        name: "Invalid Station",
        type: "INVALID_TYPE" as unknown as "KITCHEN",
        isActive: true,
        sortOrder: 1,
      }),
    ).rejects.toThrow();
  });

  it("3. should edit a station", async () => {
    const res = await createStation({
      name: "Old Name",
      type: "BAR",
      isActive: true,
      sortOrder: 1,
    });

    await updateStation(res.stationId, {
      name: "New Name",
      type: "BAR",
      isActive: true,
      sortOrder: 2,
    });

    const updated = await StationModel.findById(res.stationId);
    expect(updated?.name).toBe("New Name");
    expect(updated?.sortOrder).toBe(2);

    const audit = await AuditLogModel.findOne({ action: "UPDATE_STATION" });
    expect(audit).toBeDefined();
  });

  it("4. should deactivate a station", async () => {
    const res = await createStation({
      name: "Temp Station",
      type: "KITCHEN",
      isActive: true,
      sortOrder: 0,
    });

    await deactivateStation(res.stationId);

    const deactivated = await StationModel.findById(res.stationId);
    expect(deactivated?.isActive).toBe(false);

    const audit = await AuditLogModel.findOne({ action: "DEACTIVATE_STATION" });
    expect(audit).toBeDefined();
  });

  it("5. should reject deletion when referenced by a MenuItem", async () => {
    const stationRes = await createStation({
      name: "Referenced Station",
      type: "KITCHEN",
      isActive: true,
      sortOrder: 0,
    });

    const category = await MenuCategoryModel.create({
      name: "Drinks",
      sortOrder: 1,
    });

    await MenuItemModel.create({
      name: "Coke",
      categoryId: category._id,
      stationId: stationRes.stationId,
      priceMinor: 200,
    });

    await expect(deleteStation(stationRes.stationId)).rejects.toThrow(
      /Cannot delete station/,
    );
  });

  it("6. should maintain stable ordering in getStations()", async () => {
    await createStation({
      name: "Station B",
      type: "KITCHEN",
      isActive: true,
      sortOrder: 2,
    });
    await createStation({
      name: "Station A",
      type: "BAR",
      isActive: true,
      sortOrder: 1,
    });
    await createStation({
      name: "Station C",
      type: "CUSTOM",
      isActive: true,
      sortOrder: 3,
    });

    const stations = await getStations();
    expect(stations.length).toBe(3);
    expect(stations[0]!.name).toBe("Station A");
    expect(stations[1]!.name).toBe("Station B");
    expect(stations[2]!.name).toBe("Station C");
  });
});
