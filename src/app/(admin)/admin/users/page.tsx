import { requireAuthentication } from "@/server/auth/session";
import { requirePermission } from "@/server/auth/authorization";
import { getUsers } from "@/server/admin/user-service";
import { getRoles } from "@/server/admin/role-service";
import UsersClient from "./users-client";

export const metadata = {
  title: "Users | Admin",
};

export default async function UsersPage() {
  const session = await requireAuthentication();
  await requirePermission("user:manage");

  const [initialUsers, roles] = await Promise.all([getUsers(), getRoles()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-2">
          Manage staff accounts, roles, and access credentials.
        </p>
      </div>

      <UsersClient
        initialUsers={
          initialUsers as React.ComponentProps<
            typeof UsersClient
          >["initialUsers"]
        }
        roles={roles}
        currentUserId={session.user.id}
      />
    </div>
  );
}
