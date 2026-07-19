import { requireAuthentication } from "@/server/auth/session";
import { requirePermission } from "@/server/auth/authorization";
import { getMenuItems } from "@/server/admin/menu-item-service";
import { getCategories } from "@/server/admin/category-service";
import { getStations } from "@/server/admin/station-service";
import MenuItemsClient from "./menu-items-client";

export const metadata = {
  title: "Menu Items | Admin",
};

export default async function MenuItemsPage() {
  await requireAuthentication();
  await requirePermission("menu:manage");

  const [rawItems, categories, stations] = await Promise.all([
    getMenuItems(),
    getCategories(),
    getStations(),
  ]);

  const initialItems = rawItems.map((item) => ({
    ...item,
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Menu Items</h1>
        <p className="text-muted-foreground mt-2">
          Manage the items available on the menu, their prices, modifiers, and
          preparation stations.
        </p>
      </div>

      <MenuItemsClient
        initialItems={initialItems}
        categories={categories}
        stations={stations}
      />
    </div>
  );
}
