import { requirePermission } from "@/server/auth/authorization";
import { MenuCategoryModel } from "@/server/db/models/menu-category.model";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import {
  CategorySchema,
  CategoryReorderSchema,
  type CategoryFormData,
  type CategoryReorderData,
} from "@/shared/admin/schemas";
import { connectToDatabase } from "@/server/db/connect";

export async function getCategories() {
  await requirePermission("menu:manage");
  await connectToDatabase();

  const categories = await MenuCategoryModel.find(
    {},
    { name: 1, isActive: 1, sortOrder: 1 },
  )
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  return categories.map((c) => ({
    ...c,
    _id: c._id.toString(),
  }));
}

export async function createCategory(data: CategoryFormData) {
  const session = await requirePermission("menu:manage");
  const validated = CategorySchema.parse(data);

  await connectToDatabase();

  // Normalize name and check duplicates (case-insensitive)
  const normalizedName = validated.name.trim();
  const existing = await MenuCategoryModel.findOne({
    name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
  });

  if (existing) {
    throw new Error("A category with this name already exists");
  }

  const category = await MenuCategoryModel.create({
    ...validated,
    name: normalizedName,
  });

  await AuditLogModel.create({
    actorId: session.userId,
    action: "CREATE_CATEGORY",
    entity: "MenuCategory",
    entityId: category._id.toString(),
    metadata: { name: category.name },
  });

  return { success: true, categoryId: category._id.toString() };
}

export async function updateCategory(id: string, data: CategoryFormData) {
  const session = await requirePermission("menu:manage");
  const validated = CategorySchema.parse(data);

  await connectToDatabase();

  const normalizedName = validated.name.trim();
  const existing = await MenuCategoryModel.findOne({
    _id: { $ne: id },
    name: { $regex: new RegExp(`^${normalizedName}$`, "i") },
  });

  if (existing) {
    throw new Error("A category with this name already exists");
  }

  const category = await MenuCategoryModel.findByIdAndUpdate(
    id,
    { $set: { ...validated, name: normalizedName } },
    { returnDocument: "after", runValidators: true },
  );

  if (!category) {
    throw new Error("Category not found");
  }

  await AuditLogModel.create({
    actorId: session.userId,
    action: "UPDATE_CATEGORY",
    entity: "MenuCategory",
    entityId: category._id.toString(),
    metadata: { name: category.name, isActive: category.isActive },
  });

  return { success: true };
}

export async function deactivateCategory(id: string) {
  const session = await requirePermission("menu:manage");
  await connectToDatabase();

  const category = await MenuCategoryModel.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { returnDocument: "after" },
  );

  if (!category) {
    throw new Error("Category not found");
  }

  await AuditLogModel.create({
    actorId: session.userId,
    action: "DEACTIVATE_CATEGORY",
    entity: "MenuCategory",
    entityId: category._id.toString(),
    metadata: { reason: "Deactivated from admin" },
  });

  return { success: true };
}

export async function deleteCategory(id: string) {
  const session = await requirePermission("menu:manage");
  await connectToDatabase();

  const menuItemsCount = await MenuItemModel.countDocuments({ categoryId: id });
  if (menuItemsCount > 0) {
    throw new Error(
      `Cannot delete category. It is referenced by ${menuItemsCount} menu items. Deactivate it instead.`,
    );
  }

  const category = await MenuCategoryModel.findByIdAndDelete(id);
  if (!category) {
    throw new Error("Category not found");
  }

  await AuditLogModel.create({
    actorId: session.userId,
    action: "DELETE_CATEGORY",
    entity: "MenuCategory",
    entityId: category._id.toString(),
    metadata: { name: category.name },
  });

  return { success: true };
}

export async function reorderCategories(data: CategoryReorderData) {
  const session = await requirePermission("menu:manage");
  const validated = CategoryReorderSchema.parse(data);
  await connectToDatabase();

  const bulkOps = validated.updates.map((update) => ({
    updateOne: {
      filter: { _id: update.id },
      update: { $set: { sortOrder: update.sortOrder } },
    },
  }));

  if (bulkOps.length > 0) {
    await MenuCategoryModel.bulkWrite(bulkOps);

    await AuditLogModel.create({
      actorId: session.userId,
      action: "REORDER_CATEGORIES",
      entity: "MenuCategory",
      entityId: "bulk",
      metadata: { count: bulkOps.length },
    });
  }

  return { success: true };
}
