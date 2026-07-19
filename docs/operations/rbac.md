# RBAC Operations Guide

## Overview

The system uses Permission-Based Role-Based Access Control (RBAC). A user's access is strictly determined by the exact permissions they hold, not their raw role names. Staff members may hold multiple roles. 

## Golden Rule

Authorization logic in the server is enforced via `requirePermission('some:permission:key')`. We **never** hard-code role names (e.g. `user.role === 'admin'`) into application logic.

## Permission Catalog

The single authoritative list of permission keys lives in `src/shared/authorization/permissions.ts`. This ensures no typo-driven security holes. Unknown permission keys are rejected by TypeScript.

## Multi-Role Union

Users may hold multiple roles. The backend flattens the permission arrays from all assigned active roles and uses a `Set` to deduplicate them.
For example, a user with both `Waiter` and `Bar` roles receives both sets of permissions and can access both workspaces.

## rolesVersion Cache Invalidation

The system avoids putting full permission arrays inside JWTs. The JWT holds a `rolesVersion` integer. 

When a user's role assignment changes, or an admin changes the underlying permissions of a role, the `rolesVersion` on the affected users is incremented.

On protected requests, the server checks the authoritative `rolesVersion` in the DB. While we may implement short-lived caching later, currently the server executes an optimized `UserModel.findById().select()` check. Because `requirePermission()` is evaluated server-side, any change is enforced immediately on the next request.

## Station-Scoped Authorization

Kitchen and Bar updates require specific permissions (`line:status:kitchen` or `line:status:bar`). The required permission is derived strictly from the **stored** order line in the database, never from client input, preventing a Bar user from marking a Kitchen line as READY.

## API and Page Behaviors

- **Unauthenticated access**: Returns a `401 Unauthorized` JSON for APIs, or redirects to `/login` for pages.
- **Unauthorized access**: Returns a `403 Forbidden` JSON for APIs, or a `403` error boundary on pages.

## Safe UI Visibility

UI elements are conditionally hidden using the `PermissionGuard` Server Component. This is merely a UX improvement. The true security boundary remains `requirePermission()` at the mutation/route level.

## Deferred to Guide 09

Building the full administrative CRUD user interface for Role and User management is deferred to Guide 09.
