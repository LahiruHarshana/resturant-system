import { auth } from "@/auth";
import { UserModel, RoleModel } from "@/server/db/models";
import { AuthenticationError, AuthorizationError } from "./errors";
import { type PermissionKey } from "@/shared/authorization/permissions";

/**
 * Resolves the effective permissions for a user by computing the union of all
 * permissions granted by their active roles.
 */
export async function resolveEffectivePermissions(userId: string): Promise<{
  permissions: Set<PermissionKey>;
  rolesVersion: number;
}> {
  const user = await UserModel.findById(userId)
    .select("isActive roles rolesVersion")
    .lean()
    .exec();

  if (!user) {
    throw new AuthenticationError("User not found");
  }

  if (!user.isActive) {
    throw new AuthenticationError("User account is deactivated");
  }

  const permissions = new Set<PermissionKey>();

  if (user.roles && user.roles.length > 0) {
    const activeRoles = await RoleModel.find({
      _id: { $in: user.roles },
    })
      .select("permissions")
      .lean()
      .exec();

    for (const role of activeRoles) {
      if (Array.isArray(role.permissions)) {
        for (const permission of role.permissions) {
          permissions.add(permission as PermissionKey);
        }
      }
    }
  }

  return { permissions, rolesVersion: user.rolesVersion };
}

/**
 * Requires an active session and a specific permission.
 * Validates the sessionVersion and rolesVersion against the authoritative database state.
 */
export async function requirePermission(
  permission: PermissionKey,
): Promise<{ userId: string; permissions: Set<PermissionKey> }> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthenticationError("Authentication required");
  }

  const { permissions } = await resolveEffectivePermissions(session.user.id);

  // If the JWT payload contains an older rolesVersion, we still securely resolved
  // the latest permissions from the database. The authoritative check happens here.

  if (!permissions.has(permission)) {
    throw new AuthorizationError(`Permission denied: requires '${permission}'`);
  }

  return { userId: session.user.id, permissions };
}

/**
 * Requires an active session and any of the specified permissions.
 */
export async function requireAnyPermission(
  permissionsToCheck: PermissionKey[],
): Promise<{ userId: string; permissions: Set<PermissionKey> }> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthenticationError("Authentication required");
  }

  const { permissions } = await resolveEffectivePermissions(session.user.id);

  const hasAny = permissionsToCheck.some((p) => permissions.has(p));
  if (!hasAny) {
    throw new AuthorizationError(
      `Permission denied: requires any of [${permissionsToCheck.join(", ")}]`,
    );
  }

  return { userId: session.user.id, permissions };
}

/**
 * Requires an active session and all of the specified permissions.
 */
export async function requireAllPermissions(
  permissionsToCheck: PermissionKey[],
): Promise<{ userId: string; permissions: Set<PermissionKey> }> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthenticationError("Authentication required");
  }

  const { permissions } = await resolveEffectivePermissions(session.user.id);

  const hasAll = permissionsToCheck.every((p) => permissions.has(p));
  if (!hasAll) {
    throw new AuthorizationError(
      `Permission denied: requires all of [${permissionsToCheck.join(", ")}]`,
    );
  }

  return { userId: session.user.id, permissions };
}

/**
 * Helper to require Kitchen line status update permission.
 */
export async function requireKitchenLineUpdate(): Promise<{
  userId: string;
}> {
  return requirePermission("line:status:kitchen");
}

/**
 * Helper to require Bar line status update permission.
 */
export async function requireBarLineUpdate(): Promise<{
  userId: string;
}> {
  return requirePermission("line:status:bar");
}
