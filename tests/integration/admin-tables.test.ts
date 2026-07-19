import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { ZoneModel } from "@/server/db/models/zone.model";
import { RestaurantTableModel } from "@/server/db/models/restaurant-table.model";
import {
  createZone,
  updateZone,
  createTable,
  deleteTable,
} from "@/server/admin/table-service";
import mongoose from "mongoose";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Admin Core - Zones and Tables", () => {
  beforeEach(async () => {
    await startIntegrationDatabase();

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

  describe("Zones", () => {
    it("15. should create a valid zone", async () => {
      const res = await createZone({
        name: "Main Hall",
        isActive: true,
        sortOrder: 1,
      });
      expect(res.success).toBe(true);

      const zone = await ZoneModel.findById(res.zoneId);
      expect(zone?.name).toBe("Main Hall");
    });

    it("16. should cascade zone name update to tables", async () => {
      const zoneRes = await createZone({
        name: "Old Name",
        isActive: true,
        sortOrder: 1,
      });
      await createTable({
        label: "T1",
        seats: 4,
        zone: "Old Name",
        status: "AVAILABLE",
      });

      await updateZone(zoneRes.zoneId, {
        name: "New Name",
        isActive: true,
        sortOrder: 1,
      });

      const table = await RestaurantTableModel.findOne({ label: "T1" });
      expect(table?.zone).toBe("New Name");
    });
  });

  describe("Tables", () => {
    it("17. should create a valid table", async () => {
      const res = await createTable({
        label: "T-01",
        seats: 4,
        zone: "Main Hall",
        status: "AVAILABLE",
      });
      expect(res.success).toBe(true);

      const table = await RestaurantTableModel.findById(res.tableId);
      expect(table?.label).toBe("T-01");
      expect(table?.seats).toBe(4);
    });

    it("18. should block deletion of table with active ticket", async () => {
      const table = await RestaurantTableModel.create({
        label: "T-02",
        seats: 4,
        zone: "Main Hall",
        status: "OCCUPIED",
        currentTicketId: new mongoose.Types.ObjectId(), // Fake active ticket
      });

      await expect(deleteTable(table._id.toString())).rejects.toThrow(
        /Cannot delete a table with an active ticket/,
      );
    });

    it("19. should allow deleting an inactive table with no active ticket", async () => {
      const table = await RestaurantTableModel.create({
        label: "T-03",
        seats: 2,
        zone: "Patio",
        status: "AVAILABLE",
        currentTicketId: null,
      });

      const res = await deleteTable(table._id.toString());
      expect(res.success).toBe(true);

      const deleted = await RestaurantTableModel.findById(table._id);
      expect(deleted).toBeNull();
    });
  });
});
