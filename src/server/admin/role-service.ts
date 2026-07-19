import { requirePermission } from "@/server/auth/authorization";
import { RoleModel } from "@/server/db/models/role.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import { RoleSchema, type RoleFormData } from "@/shared/admin/schemas";
import { connectToDatabase } from "@/server/db/connect";
import { canonicalPermissionKeys } from "@/shared/authorization/permissions";

export async function getRoles() {
  await requirePermission("role:manage");
  await connectToDatabase();

  const roles = await RoleModel.find().sort({ isSystem: -1, name: 1 }).lean();
  return roles.map((r) => ({ ...r, _id: r._id.toString() }));
}

export async function getPermissionCatalog() {
  await requirePermission("role:manage");
  // return the raw catalog from the source
  const { permissionCatalog } =
    await import("@/shared/authorization/permissions");
  return permissionCatalog.map(([key, group, desc]) => ({ key, group, desc }));
}

export async function createRole(data: RoleFormData) {
  const session = await requirePermission("role:manage");
  const validated = RoleSchema.parse(data);
  await connectToDatabase();

  const normalizedName = validated.name.trim().toLowerCase();
  if (normalizedName === "super_admin") {
    throw new Error("Reserved role name");
  }

  const existing = await RoleModel.findOne({ name: normalizedName });
  if (existing) {
    throw new Error("A role with this name already exists");
  }

  // Filter out any invalid permissions just in case
  const validPermissions = validated.permissions.filter((p) =>
    canonicalPermissionKeys.includes(
      p as import("@/shared/authorization/permissions").PermissionKey,
    ),
  );

  const role = await RoleModel.create({
    ...validated,
    name: normalizedName,
    isSystem: false,
    permissions: validPermissions,
  });

  await AuditLogModel.create({
    actorId: session.userId,
    action: "CREATE_ROLE",
    entity: "Role",
    entityId: role._id.toString(),
    metadata: { name: role.name },
  });

  return { success: true, roleId: role._id.toString() };
}

export async function updateRole(id: string, data: RoleFormData) {
  const session = await requirePermission("role:manage");
  const validated = RoleSchema.parse(data);
  await connectToDatabase();

  const oldRole = await RoleModel.findById(id);
  if (!oldRole) throw new Error("Role not found");

  if (oldRole.isSystem) {
    throw new Error("Cannot edit system roles");
  }

  const normalizedName = validated.name.trim().toLowerCase();
  const existing = await RoleModel.findOne({
    _id: { $ne: id },
    name: normalizedName,
  });

  if (existing) {
    throw new Error("A role with this name already exists");
  }

  const validPermissions = validated.permissions.filter((p) =>
    canonicalPermissionKeys.includes(
      p as import("@/shared/authorization/permissions").PermissionKey,
    ),
  );

  const role = await RoleModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...validated,
        name: normalizedName,
        permissions: validPermissions,
      },
    },
    { returnDocument: "after", runValidators: true },
  );

  if (!role) throw new Error("Role not found");

  await AuditLogModel.create({
    actorId: session.userId,
    action: "UPDATE_ROLE",
    entity: "Role",
    entityId: role._id.toString(),
    metadata: { name: role.name },
  });

  return { success: true };
}

export async function deleteRole(id: string) {
  const session = await requirePermission("role:manage");
  await connectToDatabase();

  const role = await RoleModel.findById(id);
  if (!role) throw new Error("Role not found");

  if (role.isSystem) {
    throw new Error("Cannot delete system roles");
  }

  // Check if any users have this role?
  // Guide 09: "Extend user-service" handles user assignments. We should technically prevent deleting a role if users have it,
  // but User model uses string arrays for roles.
  // We can query users. Wait, I will just delete it, or block if users have it.
  // Let's check User model to see if it holds strings.
  const { UserModel } = await import("@/server/db/models/user.model");
  const usersWithRole = await UserModel.countDocuments({ roles: role._id });

  if (usersWithRole > 0) {
    throw new Error(
      `Cannot delete role. ${usersWithRole} users are assigned this role.`,
    );
  }

  await RoleModel.findByIdAndDelete(id);

  await AuditLogModel.create({
    actorId: session.userId,
    action: "DELETE_ROLE",
    entity: "Role",
    entityId: role._id.toString(),
    metadata: { name: role.name },
  });

  return { success: true };
}
