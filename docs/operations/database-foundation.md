# Database Foundation

## Purpose

Guide 06 establishes MongoDB and Mongoose foundations for correctness, concurrency safety, migrations, seeding, and high-speed restaurant operations. It does not implement authentication flows, RBAC middleware, Admin CRUD screens, waiter screens, station screens, cashier screens, or real-time publishing.

## Connection Lifecycle

`src/server/db/connect.ts` is the server-only application boundary. It delegates to `src/server/db/connect-core.ts`, which caches one Mongoose connection across hot reloads and concurrent calls. The connection uses a small pool and a bounded server-selection timeout. Connection errors are sanitized and must not print the MongoDB URI.

CLI scripts and tests use the pure connection core so they can run outside the Next.js server-only module environment.

## Model Overview

The model layer lives under `src/server/db/models/` and includes:

- User, Role, Permission
- Station, MenuCategory, MenuItem, RestaurantTable
- Ticket, OrderLine, Payment
- AuditLog, Counter, RestaurantSettings, IdempotencyRecord, MigrationLedger

Schemas use strict mode, explicit enums for finite states, timestamps where useful, ObjectId references, and hot-reload-safe model exports.

## Monetary Storage Rules

Persist all money as integer minor units. Use helpers in `src/shared/money/` for arithmetic, basis-point calculations, formatting, and major/minor conversions. Do not persist floating-point money values.

Example: LKR 1450.00 with two minor digits is stored as `145000`.

## Snapshot Strategy

Order lines store menu item ID, item-name snapshot, item-price snapshot, modifier-name snapshots, modifier-price-delta snapshots, station ID, station-type snapshot, quantity, and note. Menu edits after firing must not change existing order-line snapshots.

## Index Inventory

Indexes are defined in schemas and verified by `src/server/db/indexes.ts`.

Required hot-path indexes include:

- users: unique email, isActive
- roles: unique name
- permissions: unique key
- stations: type + isActive
- menuCategories: isActive + sortOrder
- menuItems: categoryId + isAvailable + sortOrder; stationId + isAvailable
- restaurantTables: zone + status; unique label
- tickets: unique ticketNo; tableId + status; waiterId + status + openedAt; status + closedAt
- orderLines: ticketId + status; stationId + status + firedAt
- payments: ticketId; createdAt
- auditLogs: entity + entityId + at; actorId + at
- idempotencyRecords: unique key + scope; TTL expiresAt
- restaurantSettings: singleton key
- migrationLedger: unique migration ID

## Partial Unique Open-Ticket Constraint

The Ticket schema defines a partial unique index on `tableId` for documents where `status` is `OPEN`. This prevents more than one active OPEN ticket for the same table at the database level. Later services must still translate duplicate-key errors into a clear domain conflict.

## Counter Strategy

Ticket numbers are allocated through the Counter model using an atomic `findOneAndUpdate` with `$inc`. Do not count tickets, sort by latest ticket number, or increment in application memory.

## Migration Workflow

Migrations live under `src/server/db/migrations/`. The runner records status in `MigrationLedger`, skips completed migrations, and records processed and failed counts. Migrations must process bounded batches, avoid loading entire collections, be safe to rerun, and include recovery notes.

Run status:

```bash
DB_SCRIPT_USE_MEMORY_SERVER=true npm run db:migrate:status
```

Run pending migrations:

```bash
DB_SCRIPT_USE_MEMORY_SERVER=true npm run db:migrate
```

For development databases, set safe local environment values with a database name containing `dev`, `development`, `local`, `test`, or `preview`. Scripts refuse production-looking database names and do not print connection strings.

## Seed Workflow

The seed mechanism inserts or updates foundational permissions, default role bundles, Kitchen and Bar stations, and initial restaurant settings. It never seeds real passwords and does not create a production Super Admin. Authentication bootstrap belongs to Guide 07.

Run seed:

```bash
DB_SCRIPT_USE_MEMORY_SERVER=true npm run db:seed
```

Seed output reports created, updated, skipped, and failed counts.

## Index Deployment Procedure

Use the index script to create missing schema-defined indexes and verify required indexes:

```bash
DB_SCRIPT_USE_MEMORY_SERVER=true npm run db:indexes
```

The script does not call destructive `syncIndexes`. Production index rollout should be reviewed before execution, especially when collections are large. Back up production data before index or migration operations.

## Environment Separation

Local, test, preview, and production separation is enforced by the Guide 05 environment validation and by script safety checks. Test and validation commands in Guide 06 use `mongodb-memory-server` with isolated temporary test databases.

## Backup And Recovery

Before production migrations or index changes, create a managed database backup or snapshot. Failed migrations record sanitized summaries in `MigrationLedger`. Recovery steps should use each migration's recovery note and avoid logging connection strings or secret values.

## Deferred Work

Guide 07 implements authentication and Auth.js session handling. Guide 08 implements RBAC enforcement. Guide 09 implements Admin CRUD and settings management UI. Guide 17 implements payment settlement services and full payment idempotency behavior.
