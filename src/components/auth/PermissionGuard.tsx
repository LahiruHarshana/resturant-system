import type { ReactNode } from "react";
import { resolveEffectivePermissions } from "@/server/auth/authorization";
import { auth } from "@/auth";
import type { PermissionKey } from "@/shared/authorization/permissions";

interface PermissionGuardProps {
  permission?: PermissionKey;
  permissions?: PermissionKey[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Server Component that securely renders children only if the current user
 * has the required permissions.
 *
 * NOTE: This is for UI visibility only. The underlying Server Actions or
 * API Routes MUST STILL check permissions using `requirePermission()`.
 */
export async function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return fallback;
  }

  try {
    const { permissions: userPermissions } = await resolveEffectivePermissions(
      session.user.id,
    );

    let isAuthorized = false;

    if (permission) {
      isAuthorized = userPermissions.has(permission);
    } else if (permissions && permissions.length > 0) {
      if (requireAll) {
        isAuthorized = permissions.every((p) => userPermissions.has(p));
      } else {
        isAuthorized = permissions.some((p) => userPermissions.has(p));
      }
    }

    if (isAuthorized) {
      return children;
    }
  } catch {
    // If permission resolution fails (e.g. inactive user), treat as unauthorized
    return fallback;
  }

  return fallback;
}
