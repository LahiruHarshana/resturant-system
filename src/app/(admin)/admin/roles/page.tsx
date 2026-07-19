import { requireAuthentication } from "@/server/auth/session";
import { requirePermission } from "@/server/auth/authorization";
import { getRoles, getPermissionCatalog } from "@/server/admin/role-service";
import RolesClient from "./roles-client";

export const metadata = {
  title: "Roles & Permissions | Admin",
};

export default async function RolesPage() {
  await requireAuthentication();
  await requirePermission("role:manage");

  const [rawRoles, permissionCatalog] = await Promise.all([
    getRoles(),
    getPermissionCatalog(),
  ]);

  const initialRoles = rawRoles.map((r) => ({
    ...r,
    description: r.description ?? "",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
        <p className="text-muted-foreground mt-2">
          Manage system roles and their permission assignments.
        </p>
      </div>

      <RolesClient
        initialRoles={initialRoles}
        permissionCatalog={
          permissionCatalog as React.ComponentProps<
            typeof RolesClient
          >["permissionCatalog"]
        }
      />
    </div>
  );
}
