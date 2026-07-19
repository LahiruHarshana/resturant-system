import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { MenuCategoryModel } from "@/server/db/models/menu-category.model";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { StationModel } from "@/server/db/models/station.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import {
  createCategory,
  deactivateCategory,
  deleteCategory,
  reorderCategories,
} from "@/server/admin/category-service";
import mongoose from "mongoose";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Admin Core - Categories", () => {
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

  it("7. should create a valid category", async () => {
    const res = await createCategory({
      name: "Starters",
      isActive: true,
      sortOrder: 1,
    });

    expect(res.success).toBe(true);

    const category = await MenuCategoryModel.findById(res.categoryId);
    expect(category?.name).toBe("Starters");
  });

  it("8. should reject invalid or duplicate category", async () => {
    await createCategory({ name: "Mains", isActive: true, sortOrder: 1 });

    await expect(
      createCategory({ name: "Mains", isActive: true, sortOrder: 2 }),
    ).rejects.toThrow(/already exists/);

    // Case-insensitive check
    await expect(
      createCategory({ name: "MAINS", isActive: true, sortOrder: 3 }),
    ).rejects.toThrow(/already exists/);
  });

  it("9. should reorder categories", async () => {
    const c1 = await MenuCategoryModel.create({ name: "A", sortOrder: 1 });
    const c2 = await MenuCategoryModel.create({ name: "B", sortOrder: 2 });

    const res = await reorderCategories({
      updates: [
        { id: c1._id.toString(), sortOrder: 2 },
        { id: c2._id.toString(), sortOrder: 1 },
      ],
    });

    expect(res.success).toBe(true);

    const updated1 = await MenuCategoryModel.findById(c1._id);
    const updated2 = await MenuCategoryModel.findById(c2._id);

    expect(updated1?.sortOrder).toBe(2);
    expect(updated2?.sortOrder).toBe(1);

    const audit = await AuditLogModel.findOne({ action: "REORDER_CATEGORIES" });
    expect(audit).toBeDefined();
  });

  it("10. should deactivate a referenced category safely but prevent hard deletion", async () => {
    const res = await createCategory({
      name: "Drinks",
      isActive: true,
      sortOrder: 1,
    });
    const station = await StationModel.create({ name: "Bar", type: "BAR" });

    await MenuItemModel.create({
      name: "Cola",
      categoryId: res.categoryId,
      stationId: station._id,
      priceMinor: 200,
    });

    // Hard delete should fail
    await expect(deleteCategory(res.categoryId)).rejects.toThrow(
      /Cannot delete category/,
    );

    // Deactivation should succeed
    const deactRes = await deactivateCategory(res.categoryId);
    expect(deactRes.success).toBe(true);

    const deactivated = await MenuCategoryModel.findById(res.categoryId);
    expect(deactivated?.isActive).toBe(false);
  });
});
