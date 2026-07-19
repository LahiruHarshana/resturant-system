# ADR 0002: Permission-Based RBAC With Multi-Role Users

## Status

Accepted

## Context

The system must allow one staff member to hold multiple roles, such as Waiter and Bar. Super Admins must manage roles and permissions without code changes. Guide 01 forbids hard-coded role checks, and Guide 02 defines station-scoped business invariants that prevent Bar users from updating Kitchen lines and Kitchen users from updating Bar lines.

## Decision

Use permission-based RBAC. Roles are named bundles of permissions stored in the database. Users may hold multiple roles. Effective permissions are the union of all active assigned role permissions. Server-side authorization checks permissions, never role names.

Protected operations will use permission guards such as `requirePermission(session, "order:create")`. Station-scoped operations derive the required permission from stored authoritative data, such as the order line station type, not from client input.

## Alternatives Considered

| Alternative | Reason not selected |
|---|---|
| Single role per user | Fails the multi-role staff requirement. |
| Hard-coded role branches | Requires code changes for operational policy changes and violates Guide 01 and Guide 02. |
| Client-only permission checks | Insecure; hidden UI controls can be bypassed. |
| Attribute-based authorization only | More complex than needed for the first release, though attributes such as station type are used as scoped checks. |

## Consequences

Positive:

- Super Admin can change access without deployment.
- Multi-role users receive all allowed workspaces.
- Station-scoped permissions map directly to Kitchen and Bar invariants.
- Automated tests can verify permission union and denial cases.

Negative:

- Permission cache invalidation must be designed carefully.
- UI navigation must be built from effective permissions.
- Role edits require audit logging and connected clients may need authorization refresh events.

## Security Impact

- Every protected Route Handler and mutation must check server-side permissions.
- Deactivated users must be denied even if they hold an old session.
- Role edits, assignment changes, and permission changes require audit records.
- Station line updates must load the stored line station before choosing `line:status:kitchen` or `line:status:bar`.

## Performance Impact

- Effective permissions should be cached briefly by user ID and roles version.
- Permission checks must use targeted projections and avoid broad user/role loading on hot paths.
- Role changes must invalidate caches predictably.

## Operational Impact

- Admin tooling must expose roles, permissions, multi-role assignments, and plain-language labels.
- Emergency Super Admin access procedures must be documented later.
- Permission misconfiguration is an operational risk and must be mitigated with audit logs and tests.

## Conditions To Revisit

Revisit this decision if:

- Multi-branch tenancy requires location-scoped permissions beyond station and role membership.
- Policy becomes complex enough to require a dedicated policy engine.
- External identity providers become mandatory for the restaurant operator.
- Regulatory or enterprise requirements demand centralized identity management.
