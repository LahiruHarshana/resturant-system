---
title: Permission-Based RBAC and Multi-Role Access
order: 8
phase: identity
status: not-started
---

# Permission-Based RBAC and Multi-Role Access

## Golden rule

Never write authorization logic such as:

```ts
if (user.role === 'waiter')
```

Always check a permission:

```ts
await requirePermission(session, 'order:create')
```

## Permission catalog

Seed at least:

```text
user:manage
role:manage
menu:manage
table:manage
table:read
order:create
order:update
order:close
line:read:kitchen
line:read:bar
line:status:kitchen
line:status:bar
line:void
ticket:cancel
payment:create
receipt:print
report:view
audit:view
```

## Default role bundles

- Super Admin: all permissions.
- Manager: menu, table, reports, audit, void, and cancel permissions.
- Waiter: table read, order create/update/close, and served status capability.
- Kitchen: Kitchen read and status permissions.
- Bar: Bar read and status permissions.
- Cashier: closed-ticket read, payment, and receipt permissions.

## Effective permission calculation

1. Load all active roles assigned to the user.
2. Flatten their permission arrays.
3. Deduplicate with a `Set`.
4. Cache briefly by user ID and roles version.
5. Invalidate the cache immediately when a role or assignment changes.

## Server guard

`requirePermission()` must:

- Require an authenticated session.
- Load current user state.
- Reject inactive users.
- Check the effective permission set.
- Return a typed 403 error.
- Never rely on hidden UI controls.

## Station-scoped authorization

For line updates:

```text
station type kitchen -> require line:status:kitchen
station type bar     -> require line:status:bar
```

The station must be read from the stored line, never from the request body.

## Multi-role UI

Build navigation from permissions. A user with Waiter and Bar roles should see both the waiter workspace and Bar Display. Do not force the user to log out and switch accounts. Provide a fast workspace switcher.

## Immediate permission changes

After an admin edits a role:

- Increment the role version.
- Invalidate permission caches.
- Notify connected clients to refresh authorization.
- Block the next forbidden request on the server even before UI refresh.

## Tests

- Permission union across two roles.
- Duplicate permission removal.
- Bar user denied on Kitchen line.
- Waiter plus Bar user allowed on both interfaces.
- Deactivated user denied despite a valid old token.
- Role edit takes effect without code changes.

## Exit gate

All protected mutations use `requirePermission()`, and no server authorization branch compares hard-coded role names.
