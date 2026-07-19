import mongoose from "mongoose";
import { RoleModel, UserModel, AuditLogModel } from "@/server/db/models";
import { requirePermission } from "./authorization";
import { type PermissionKey } from "@/shared/authorization/permissions";

/**
 * Updates the permissions of a given role.
 * Requires the "role:manage" permission.
 * Automatically increments the rolesVersion for all users holding this role
 * to ensure immediate authorization cache invalidation.
 */
export async function updateRolePermissions(
  roleId: string,
  newPermissions: PermissionKey[],
): Promise<void> {
  const { userId } = await requirePermission("role:manage");

  const role = await RoleModel.findById(roleId).exec();
  if (!role) {
    throw new Error("Role not found");
  }

  // Perform the update
  role.permissions = newPermissions;
  await role.save();

  // Invalidate all users who hold this role by incrementing their rolesVersion
  await UserModel.updateMany(
    { roles: role._id },
    { $inc: { rolesVersion: 1 } },
  ).exec();

  // Audit log
  await AuditLogModel.create({
    action: "UPDATE_ROLE_PERMISSIONS",
    actorId: userId,
    entity: "Role",
    entityId: role._id.toString(),
    metadata: {
      newPermissions,
    },
  });
}

/**
 * Assigns a set of roles to a user.
 * Requires the "user:manage" permission.
 * Increments the user's rolesVersion.
 */
export async function assignRolesToUser(
  targetUserId: string,
  roleIds: string[],
): Promise<void> {
  const { userId } = await requirePermission("user:manage");

  const targetUser = await UserModel.findById(targetUserId).exec();
  if (!targetUser) {
    throw new Error("Target user not found");
  }

  // Validate all roles exist
  const count = await RoleModel.countDocuments({
    _id: { $in: roleIds },
  }).exec();
  if (count !== roleIds.length) {
    throw new Error("One or more roles do not exist");
  }

  // Apply assignment
  targetUser.roles = roleIds as unknown as mongoose.Types.ObjectId[];
  targetUser.rolesVersion += 1;
  await targetUser.save();

  // Audit log
  await AuditLogModel.create({
    action: "ASSIGN_ROLES",
    actorId: userId,
    entity: "User",
    entityId: targetUser._id.toString(),
    metadata: {
      roleIds,
    },
  });
}

/**
 * Removes a set of roles from a user.
 * Requires the "user:manage" permission.
 * Increments the user's rolesVersion.
 */
export async function removeRolesFromUser(
  targetUserId: string,
  roleIds: string[],
): Promise<void> {
  const { userId } = await requirePermission("user:manage");

  const targetUser = await UserModel.findById(targetUserId).exec();
  if (!targetUser) {
    throw new Error("Target user not found");
  }

  // Apply removal
  targetUser.roles = targetUser.roles.filter(
    (rid: mongoose.Types.ObjectId) => !roleIds.includes(rid.toString()),
  ) as unknown as mongoose.Types.ObjectId[];
  targetUser.rolesVersion += 1;
  await targetUser.save();

  // Audit log
  await AuditLogModel.create({
    action: "REMOVE_ROLES",
    actorId: userId,
    entity: "User",
    entityId: targetUser._id.toString(),
    metadata: {
      roleIdsRemoved: roleIds,
    },
  });
}
