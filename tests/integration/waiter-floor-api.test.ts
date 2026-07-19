import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  startIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import * as authorization from "@/server/auth/authorization";
import mongoose from "mongoose";
import { ZoneModel } from "@/server/db/models/zone.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import { getFloorTables } from "@/server/waiter/floor-service";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Waiter Core - Floor Service", () => {
  let waiterId: string;

  beforeEach(async () => {
    await startIntegrationDatabase();
    waiterId = new mongoose.Types.ObjectId().toString();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
  });

  it("should reject unauthorized users", async () => {
    vi.spyOn(authorization, "requirePermission").mockRejectedValue(
      new Error("Permission denied: Missing table:read"),
    );

    await expect(getFloorTables()).rejects.toThrow("Permission denied");
  });

  it("should return compact tables grouped by active zones", async () => {
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: waiterId,
      permissions: new Set(["table:read"]),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    await ZoneModel.create([
      { name: "Active Zone", sortOrder: 1, isActive: true },
      { name: "Inactive Zone", sortOrder: 2, isActive: false },
    ]);

    await RestaurantTableModel.create([
      { label: "T1", seats: 2, zone: "Active Zone", status: "AVAILABLE" },
      { label: "T2", seats: 4, zone: "Active Zone", status: "OCCUPIED" },
      { label: "T3", seats: 2, zone: "Inactive Zone", status: "AVAILABLE" },
      { label: "T4", seats: 2, zone: "Active Zone", status: "INACTIVE" },
    ]);

    const result = await getFloorTables();

    // 1. Inactive zones excluded
    expect(result).toHaveLength(1);
    expect(result[0]!.zoneName).toBe("Active Zone");

    // 2. Inactive tables excluded, so only T1 and T2 should remain
    expect(result[0]!.tables).toHaveLength(2);
    expect(result[0]!.tables.map((t) => t.label).sort()).toEqual(["T1", "T2"]);

    // 3. Compact DTO
    const t1 = result[0]!.tables.find((t) => t.label === "T1")!;
    expect(
      (t1 as unknown as Record<string, unknown>).createdAt,
    ).toBeUndefined();
    expect(t1.status).toBe("AVAILABLE");
  });
});
