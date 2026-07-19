import { connectToDatabase } from "@/server/db/connect";
import { MenuCategoryModel } from "@/server/db/models/menu-category.model";
import { MenuItemModel } from "@/server/db/models/menu-item.model";
import { StationModel } from "@/server/db/models/station.model";
import type { WaiterMenuDTO } from "@/shared/waiter/schemas";
import { requirePermission } from "@/server/auth/authorization";

export async function getCompactMenu(): Promise<WaiterMenuDTO> {
  // Use the same permission that allows reading a ticket (table:read)
  await requirePermission("table:read");

  await connectToDatabase();

  const [categories, rawItems, stations] = await Promise.all([
    MenuCategoryModel.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .select({ name: 1 })
      .lean(),
    MenuItemModel.find({ isAvailable: true })
      .sort({ sortOrder: 1 })
      .select({
        categoryId: 1,
        name: 1,
        description: 1,
        priceMinor: 1,
        stationId: 1,
        modifiers: 1,
      })
      .lean(),
    StationModel.find({ isActive: true }).select({ _id: 1 }).lean(),
  ]);

  const activeStationIds = new Set(stations.map((s) => s._id.toString()));

  const activeCategoryIds = new Set(categories.map((c) => c._id.toString()));

  const validItems = rawItems.filter((item) => {
    return (
      activeStationIds.has(item.stationId.toString()) &&
      activeCategoryIds.has(item.categoryId.toString())
    );
  });

  return {
    categories: categories.map((c) => ({
      id: c._id.toString(),
      name: c.name,
    })),
    items: validItems.map((item) => ({
      id: item._id.toString(),
      categoryId: item.categoryId.toString(),
      name: item.name,
      description: item.description ?? undefined,
      priceMinor: item.priceMinor,
      stationId: item.stationId.toString(),
      modifiers: item.modifiers?.map((group) => ({
        name: group.name,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        options: group.options.map((opt) => ({
          name: opt.name,
          priceDeltaMinor: opt.priceDeltaMinor,
        })),
      })),
    })),
  };
}
