import { requireAuthentication } from "@/server/auth/session";
import { requirePermission } from "@/server/auth/authorization";
import { getCategories } from "@/server/admin/category-service";
import CategoriesClient from "./categories-client";

export const metadata = {
  title: "Categories | Admin",
};

export default async function CategoriesPage() {
  await requireAuthentication();
  await requirePermission("menu:manage");

  const initialCategories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground mt-2">
          Manage menu categories and their display order.
        </p>
      </div>

      <CategoriesClient initialCategories={initialCategories} />
    </div>
  );
}
