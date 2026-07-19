---
title: Database Models, Indexes, and Migrations
order: 6
phase: data
status: not-started
---

# Database Models, Indexes, and Migrations

## Objective

Build the MongoDB foundation for correctness and speed before implementing feature screens.

## Connection management

Create a cached Mongoose connection in `src/server/db/connect.ts`.

Requirements:

- Reuse the connection across hot reloads and server invocations.
- Use a small connection pool suitable for the selected hosting tier.
- Set a bounded server-selection timeout.
- Never open a new connection inside each model or request.

## Money representation

Store all monetary values as integer minor units:

```text
LKR 1450.00 -> 145000 when two minor digits are configured
```

Suggested field names:

- `priceMinor`
- `subtotalMinor`
- `discountMinor`
- `serviceChargeMinor`
- `taxMinor`
- `totalMinor`
- `tenderedMinor`
- `changeMinor`

Use shared helpers for formatting and arithmetic.

## Core collections

Create models for:

- User
- Role
- Permission
- Station
- MenuCategory
- MenuItem
- RestaurantTable
- Ticket
- OrderLine
- Payment
- AuditLog
- Counter
- RestaurantSettings
- IdempotencyRecord

## Security corrections

Use `passwordHash` and `pinHash`. Never persist a raw PIN.

## Mandatory indexes

```text
users:               unique email, isActive
roles:               unique name
permissions:         unique key
stations:            type + isActive
menuCategories:      isActive + sortOrder
menuItems:           categoryId + isAvailable + sortOrder
menuItems:           stationId + isAvailable
tables:              zone + status
tickets:             unique ticketNo
tickets:             tableId + status
tickets:             waiterId + status + openedAt
tickets:             status + closedAt
orderLines:          ticketId + status
orderLines:          stationId + status + firedAt
payments:            ticketId
payments:            createdAt
auditLogs:           entity + entityId + at
auditLogs:           actorId + at
idempotencyRecords:  unique key + scope; TTL on expiresAt
```

Add a partial unique index to prevent more than one OPEN ticket per table.

## Sequential ticket numbers

Use a `counters` collection and atomic `findOneAndUpdate({$inc:{seq:1}})` operation. Do not derive the next number by sorting tickets.

## Snapshots

Each order line stores:

- Menu item ID.
- Name snapshot.
- Price snapshot in minor units.
- Modifier snapshots and price deltas.
- Station ID and station type snapshot.
- Quantity and note.

This guarantees stable receipts and reduces hot-path joins.

## Migration strategy

Mongoose schema changes are not a migration plan. Create numbered idempotent scripts under `src/server/db/migrations/` and a migration ledger collection.

Every migration must:

- Be safe to run more than once.
- Report processed and failed counts.
- Avoid loading the whole collection into memory.
- Have a rollback or recovery note.

## Performance rules

- Use `.lean()` for read-only queries.
- Use explicit projections.
- Do not use broad `populate()` calls in waiter, station, or cashier hot paths.
- Batch inserts and updates when firing multiple order lines.
- Paginate audit logs and reports.

## Tests

- Unique open-ticket constraint.
- Counter concurrency.
- Money arithmetic.
- Index existence in integration setup.
- Snapshot immutability after a menu price change.

## Exit gate

All models compile, indexes are created, seed data can be inserted, and concurrency tests show that one table cannot receive two OPEN tickets.
