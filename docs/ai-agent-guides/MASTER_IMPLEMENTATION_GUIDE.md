# Restaurant Order Management System - Complete AI Agent Implementation Guide

> This combined file mirrors the numbered files in this package. Use the individual files for phase-by-phase execution.

---

## Source file: `00_README.md`

---
title: Restaurant Order Management System - AI Agent Implementation Guides
order: 0
status: ready
source: Restaurant_System_Plan.docx
---

# Restaurant Order Management System

This folder converts the complete planning document into an ordered, implementation-ready set of Markdown guides. The guides are written for software engineers and AI coding agents. Follow them in numeric order. Do not skip a gate unless the dependency is already complete and verified.

## Primary outcome

Build a fast, modern, mobile-first Restaurant Order Management System with:

- Waiter table ordering from a phone or installable PWA.
- Automatic Kitchen and Bar routing at order-line level.
- Real-time Kitchen Display System and Bar Display System updates.
- Live READY notifications to the responsible waiter.
- Additional rounds on the same open ticket.
- Ticket closure, cashier settlement, payment, and receipt generation.
- Flexible permission-based access control with multiple roles per user.
- Admin management for users, roles, stations, menu, tables, reports, and audit logs.

## Recommended implementation baseline

- Next.js 15 App Router and TypeScript.
- MongoDB Atlas Free cluster and Mongoose.
- Auth.js credentials authentication with JWT sessions.
- Tailwind CSS, shadcn/ui, and Lucide icons.
- TanStack Query for server state and Zustand only for small transient client state.
- Zod schemas shared between UI and server.
- Pusher private channels for the simplest serverless real-time deployment, with an adapter that can later support Socket.IO.
- Vercel for the web application and MongoDB Atlas for data.

## Important modernizations applied by these guides

The source plan is preserved, but these implementation improvements are mandatory:

1. Store money in integer minor units, never floating-point numbers.
2. Store `pinHash`, never a plaintext PIN.
3. Use idempotency keys for payment and order-line submission.
4. Use database indexes and projection-first queries from the beginning.
5. Use atomic ticket and table operations to prevent duplicate open tickets.
6. Use small real-time events and re-fetch authoritative state after reconnect.
7. Treat performance and UX as acceptance criteria, not later polish.
8. Do not assume managed backups exist on a free database tier; run verified exports.

## Guide order

| Range | Purpose |
|---|---|
| 01-05 | Agent rules, scope, architecture, repository, and environments |
| 06-09 | Database, authentication, authorization, and admin core |
| 10-15 | Waiter ordering, station routing, real-time, KDS/BDS, and live ticket |
| 16-19 | Cashier, payments, receipts, reports, and audit |
| 20-23 | Modern UI/UX, speed, PWA reliability, and security |
| 24-27 | Testing, operations, deployment, acceptance, and release |
| 28-31 | Enhancements, contracts, reusable agent prompts, and progress tracking |

## Non-negotiable product targets

- A trained waiter must be able to open a table and fire an order in under 15 seconds.
- Every primary waiter action must be reachable within two taps from its immediate context.
- Status mutations must feel immediate through optimistic UI, while the server remains authoritative.
- A Kitchen user must never see or update Bar-only lines unless explicitly granted permission.
- A multi-role user must receive the union of all assigned role permissions.
- Closing a ticket must block new items and add it to the cashier queue.
- Payment must be idempotent, free the table exactly once, and produce a correct receipt.

## How an AI agent must use these files

1. Read `01_AI_AGENT_OPERATING_PROTOCOL.md` first.
2. Read the current phase guide and all declared dependencies.
3. Inspect the existing repository before creating or replacing files.
4. Implement only the requested phase.
5. Run the exact validation commands described by the guide.
6. Update `31_PROGRESS_TRACKER.md` and provide a handoff summary.

## Completion rule

The project is not complete when screens merely render. It is complete only when the acceptance scenarios in `27_RELEASE_ACCEPTANCE_AND_HANDOVER.md` pass on real mobile, kitchen, cashier, and admin devices.

---

## Source file: `01_AI_AGENT_OPERATING_PROTOCOL.md`

---
title: AI Agent Operating Protocol
order: 1
phase: governance
status: not-started
---

# AI Agent Operating Protocol

## Objective

Ensure that every AI coding agent works predictably, preserves architecture, avoids destructive changes, and leaves the repository in a verifiable state.

## Required agent behavior

### Before coding

1. Read `00_README.md`, this file, the current task guide, and its dependencies.
2. Inspect the repository tree, package manifest, environment template, database models, API routes, and tests.
3. Identify existing conventions before creating new ones.
4. Write a short implementation plan containing:
   - Files to create or edit.
   - Data model or API changes.
   - Tests to add.
   - Performance impact.
   - Migration or rollback requirements.
5. Confirm that the requested work belongs to the current phase.

### While coding

- Use TypeScript strict mode and avoid `any`.
- Prefer small domain services over business logic inside React components or route handlers.
- Keep route handlers thin: authenticate, authorize, validate, call a service, map the response.
- Never trust client-supplied prices, station IDs, totals, permissions, or status transitions.
- Never hard-code role names in authorization logic.
- Never add a new dependency when the existing stack can solve the problem cleanly.
- Never silently change a contract used by another phase.
- Avoid broad refactors during feature work.
- Add comments only for non-obvious decisions, not for obvious syntax.

### After coding

Run, at minimum:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run relevant Playwright tests when the change affects a user flow.

## Required output from every agent task

The handoff must contain:

```text
Task:
Status: completed | partial | blocked
Files changed:
Database changes:
API or event contract changes:
Tests added or updated:
Commands executed:
Known limitations:
Next recommended guide:
```

## Change control rules

Create an Architecture Decision Record under `docs/adr/` before changing any of these:

- Next.js monolith architecture.
- MongoDB as the main database.
- Permission-based authorization.
- Ticket and order-line status models.
- Real-time provider abstraction.
- Money storage format.
- API response envelope.

## Definition of done for an agent task

A task is complete only when:

- The implementation matches the guide.
- Validation passes.
- Error, loading, empty, and permission-denied states exist where applicable.
- Performance-sensitive queries use indexes and projections.
- Security checks are server-side.
- Documentation and progress tracking are updated.

---

## Source file: `02_PRODUCT_SCOPE_AND_BUSINESS_FLOW.md`

---
title: Product Scope and Business Flow
order: 2
phase: discovery
status: not-started
---

# Product Scope and Business Flow

## Agent objective

Translate the restaurant workflow into explicit domain rules before building UI or APIs.

## Personas

- Super Admin: full control, including role and permission management.
- Manager: operational oversight, menu, tables, reports, cancellation, and voiding.
- Waiter: table opening, ordering, serving, and ticket closure.
- Kitchen: prepares Kitchen station lines.
- Bar: prepares Bar station lines.
- Cashier: settles closed tickets and generates receipts.

A single user may hold multiple roles. The application must expose all functions allowed by the union of permissions.

## Canonical order lifecycle

1. The waiter selects a free table.
2. The server creates one OPEN ticket and binds it to the table and waiter.
3. The waiter adds items, quantities, modifiers, and notes.
4. The server resolves the station from each menu item and creates immutable order-line snapshots.
5. NEW lines are published to the correct Kitchen or Bar channel.
6. Station staff move a line from NEW to PREPARING, then READY.
7. The waiter receives an immediate READY alert, serves the item, and marks it SERVED.
8. Additional lines may be added while the ticket remains OPEN.
9. The waiter closes the ticket. No more items may be added.
10. The cashier settles the CLOSED ticket.
11. A successful idempotent payment changes the ticket to PAID and frees the table.

## Ticket statuses

```text
OPEN -> CLOSED -> PAID
OPEN -> CANCELLED
CLOSED -> CANCELLED only with elevated permission and an audit reason
```

## Order-line statuses

```text
NEW -> PREPARING -> READY -> SERVED
NEW | PREPARING | READY -> VOID, with permission and reason
```

Reject all reverse or skipped transitions unless a documented manager override exists.

## Core invariants

- A table has no more than one OPEN ticket.
- A PAID or CANCELLED ticket cannot accept new lines.
- Order-line name, price, modifiers, and station are frozen at fire time.
- Only the station assigned to the line can advance its preparation status.
- Totals are calculated on the server from non-VOID line snapshots.
- Payment can settle a ticket only once.
- Every cancellation, void, role edit, and payment produces an audit record.

## Scope exclusions for the first release

Do not implement these until the core release passes acceptance:

- Split bills.
- Table merging or transfer.
- Inventory deduction.
- Guest QR ordering.
- Loyalty.
- Multi-branch tenancy.
- Kitchen printer hardware.

## Deliverables

- `docs/domain/order-lifecycle.md`
- `docs/domain/invariants.md`
- Status transition unit tests.
- A simple Mermaid lifecycle diagram.

## Exit gate

Every developer and agent must be able to explain the difference between ticket status and order-line status. No database model or screen work should proceed until the invariants are documented and reviewed.

---

## Source file: `03_ARCHITECTURE_AND_TECHNICAL_DECISIONS.md`

---
title: Architecture and Technical Decisions
order: 3
phase: architecture
status: not-started
---

# Architecture and Technical Decisions

## Target architecture

Use a full-stack Next.js 15 monolith:

```text
Role-aware React UI
        |
Next.js App Router + Route Handlers
        |
Domain services + RBAC + validation
        |
MongoDB Atlas / Mongoose
        |
Pusher private channels through a RealTimeProvider interface
```

## Why this architecture

- One TypeScript codebase reduces contract drift.
- Route Handlers provide a clear REST boundary for PWA, station, cashier, and admin clients.
- MongoDB fits menu, ticket, line, and audit documents while supporting required indexes.
- A provider interface prevents Pusher-specific code from leaking through the domain.
- The monolith is simpler to deploy and operate for one restaurant.

## Required boundaries

```text
src/app/                 Pages, layouts, and route handlers
src/components/          Reusable UI only
src/features/            Persona and feature-specific UI
src/server/auth/         Authentication and session helpers
src/server/rbac/         Permission calculation and guards
src/server/db/           Connection, models, indexes, migrations
src/server/services/     Business operations
src/server/realtime/     Provider interface and adapters
src/shared/contracts/    Zod schemas, enums, DTOs, event contracts
src/shared/money/        Minor-unit helpers
src/shared/errors/       Typed application errors
```

## Route Handler rule

A handler must do only this:

1. Authenticate.
2. Authorize.
3. Parse and validate.
4. Call one domain service.
5. Return the standard response envelope.

Do not calculate totals, decide station routing, or perform status transitions directly inside route files.

## Real-time rule

Database writes are authoritative. Publish a real-time event only after the write succeeds. Events should normally contain IDs, version numbers, status, and timestamps rather than large hydrated documents.

## Current Next.js 15 implementation notes

- Route Handlers live under the `app` directory.
- GET Route Handlers are not cached by default; explicitly cache only safe reference data.
- Dynamic APIs such as `params`, `cookies()`, and `headers()` are asynchronous in Next.js 15.
- Keep database code on the Node.js runtime.

## Architecture deliverables

- `docs/architecture/system-context.md`
- `docs/architecture/container-diagram.md`
- `docs/adr/0001-nextjs-monolith.md`
- `docs/adr/0002-permission-based-rbac.md`
- `docs/adr/0003-realtime-provider.md`
- `docs/adr/0004-money-minor-units.md`

## Exit gate

No feature may depend directly on Pusher, Mongoose models, or Auth.js from a React presentation component. Dependencies must pass through typed feature hooks or server services.

---

## Source file: `04_REPOSITORY_BOOTSTRAP_AND_STRUCTURE.md`

---
title: Repository Bootstrap and Structure
order: 4
phase: foundation
status: not-started
---

# Repository Bootstrap and Structure

## Objective

Create a clean Next.js 15 TypeScript repository with strict quality gates and a structure that multiple AI agents can modify safely.

## Bootstrap

```bash
npx create-next-app@15 restaurant-roms \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*"
cd restaurant-roms
```

Install the baseline packages using versions compatible with Next.js 15 and commit the lockfile:

```bash
npm install mongoose zod bcryptjs next-auth@beta \
  @tanstack/react-query zustand \
  pusher pusher-js \
  react-hook-form @hookform/resolvers \
  lucide-react
npm install -D prettier prettier-plugin-tailwindcss \
  vitest @vitest/coverage-v8 mongodb-memory-server \
  @playwright/test eslint-plugin-security
npx shadcn@latest init
```

## Required scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format:check": "prettier --check .",
    "format:write": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

## Create the directory structure

```text
src/
  app/
    (auth)/
    (waiter)/
    (station)/
    (cashier)/
    (admin)/
    api/
  components/
    ui/
    feedback/
    layout/
  features/
    auth/
    tables/
    ordering/
    stations/
    cashier/
    admin/
  server/
    auth/
    db/models/
    db/migrations/
    rbac/
    services/
    realtime/
  shared/
    contracts/
    errors/
    money/
    constants/
    utils/
tests/
  unit/
  integration/
  e2e/
docs/
  adr/
  architecture/
  domain/
```

## TypeScript and lint rules

- Enable strict mode.
- Enable `noUncheckedIndexedAccess`.
- Reject unused imports.
- Do not suppress errors with `@ts-ignore` without a linked issue.
- Use absolute `@/` imports.
- Use server-only modules for secrets and database access.

## Foundation UI

Create:

- Global font and spacing tokens.
- `AppShell`, `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, and `PermissionDenied` components.
- Toast provider.
- Query provider.
- Error boundary and not-found page.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Exit gate

A clean clone must install, run, test, and build without local undocumented steps.

---

## Source file: `05_ENVIRONMENTS_CONFIGURATION_AND_SECRETS.md`

---
title: Environments, Configuration, and Secrets
order: 5
phase: foundation
status: not-started
---

# Environments, Configuration, and Secrets

## Objective

Provide validated configuration for local, preview, test, and production environments without leaking secrets.

## Environment separation

Use separate databases for:

- Local development.
- Automated tests.
- Preview deployments.
- Production.

At minimum, use separate database names. Prefer separate Atlas projects when operationally practical.

## Environment variables

Create `.env.example`:

```dotenv
NODE_ENV=development
APP_URL=http://localhost:3000
MONGODB_URI=
AUTH_SECRET=
AUTH_TRUST_HOST=true
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
CLOUDINARY_URL=
RESEND_API_KEY=
SENTRY_DSN=
```

Only `NEXT_PUBLIC_*` variables may be exposed to the browser.

## Validate configuration at startup

Create `src/server/config/env.ts` with Zod. Parse once and fail fast with a clear error when required values are absent.

Required rules:

- Production `APP_URL` must use HTTPS.
- `AUTH_SECRET` must be long and random.
- Server-only Pusher secrets must never be exported to client code.
- Test mode must not connect to the production database.

## Secret handling

- Never commit `.env*` files except `.env.example`.
- Store preview and production values in the hosting platform.
- Rotate credentials when a staff member with access leaves.
- Keep a secret inventory in a protected operations document.
- Do not print full connection strings or tokens in logs.

## Configuration flags

Use typed configuration for values that may differ by restaurant:

```ts
interface RestaurantSettings {
  currency: string;
  currencyMinorDigits: number;
  serviceChargeBps: number;
  taxBps: number;
  receiptFooter?: string;
  readySoundEnabled: boolean;
  kitchenAgingMinutes: number;
  urgentAgingMinutes: number;
}
```

Store settings in the database and cache them briefly. Do not hard-code tax or service charge in components.

## Exit gate

The application must start with a valid environment, fail clearly with an invalid environment, and prove that no server secret is present in the client bundle.

---

## Source file: `06_DATABASE_MODELS_INDEXES_AND_MIGRATIONS.md`

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

---

## Source file: `07_AUTHENTICATION_AND_SESSION_MANAGEMENT.md`

---
title: Authentication and Session Management
order: 7
phase: identity
status: not-started
---

# Authentication and Session Management

## Objective

Implement secure staff login with Auth.js credentials authentication and JWT sessions.

## Login methods

1. Email and password for admin, manager, and normal staff access.
2. Optional staff PIN for approved shared POS devices.

Do not implement public self-registration.

## Password login

- Normalize email before lookup.
- Load only the fields needed for authentication.
- Compare with bcrypt at cost 12 or the approved measured cost.
- Reject inactive users.
- Return one generic invalid-credentials message.
- Record failed attempts without logging the password.

## PIN login

- Store `pinHash`, not `pin`.
- Require a selected user or staff identifier plus PIN; do not let a short PIN be the only global identifier.
- Apply attempt throttling and temporary lockout.
- Make PIN login configurable per user and device policy.
- Require password reauthentication for sensitive admin actions.

## JWT content

Keep the token small:

```ts
{
  sub: userId,
  name,
  rolesVersion,
  sessionVersion
}
```

Do not store the full permission list permanently in a long-lived token. Compute permissions at login and refresh them when role versions change, or include a short-lived permission cache with version invalidation.

## Session security

- Use secure, HTTP-only, same-site cookies.
- Use HTTPS in production.
- Rotate or invalidate sessions when a user is deactivated.
- Increment `sessionVersion` after password reset or account compromise.
- Set a reasonable idle and absolute session lifetime.

## Required files

```text
src/auth.ts
src/server/auth/authorize-credentials.ts
src/server/auth/session.ts
src/server/auth/password.ts
src/server/auth/pin.ts
src/app/(auth)/login/page.tsx
```

## Login UX

- Large fields and submit button.
- Password visibility toggle.
- Clear loading state.
- Plain-language failure message.
- No disclosure of whether an account exists.
- Keyboard and screen-reader support.

## Tests

- Valid password.
- Invalid password.
- Inactive user.
- Locked PIN.
- Session invalidation after `sessionVersion` change.
- No password or hash in session payload.

## Exit gate

A seeded Super Admin can sign in, inactive users cannot sign in, and all protected routes reject unauthenticated requests.

---

## Source file: `08_PERMISSION_BASED_RBAC_AND_MULTI_ROLE_ACCESS.md`

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

---

## Source file: `09_ADMIN_CORE_STATIONS_MENU_TABLES_USERS_ROLES.md`

---
title: Admin Core - Stations, Menu, Tables, Users, and Roles
order: 9
phase: admin-core
status: not-started
---

# Admin Core

## Objective

Build the configuration tools required before operational ordering can start.

## Build order

1. Stations.
2. Menu categories.
3. Menu items and modifiers.
4. Zones and tables.
5. Roles and permissions.
6. Users and multi-role assignment.
7. Restaurant settings.

## Station management

Fields:

- Name.
- Type: `kitchen`, `bar`, or custom operational type.
- Active status.
- Sort order.

Block deletion when referenced. Prefer deactivation.

## Menu categories

- Name.
- Sort order.
- Active status.

Support drag or button-based reordering, but persist a stable numeric sort order.

## Menu items

Required fields:

- Name.
- Description.
- Price in display currency, converted to minor units on the server.
- Category.
- Preparation station.
- Availability.
- Sort order.
- Optional optimized image.
- Modifier groups with min/max selection rules and price deltas.

The station assignment is mandatory because it drives routing.

## Tables and zones

- Zone name.
- Table label.
- Seat count.
- Active status.
- Operational status is managed by the order workflow, not manually edited during normal service.

## Role editor

- Group checkboxes by resource.
- Show a plain-language label and technical key.
- Warn when removing a permission from active users.
- Prevent deletion of protected system roles, while still allowing controlled edits when policy permits.

## User editor

- Name, email, phone.
- Active state.
- Multiple role selection.
- Temporary password or invite workflow.
- Optional quick-login PIN setup.

Never display stored password or PIN hashes.

## UX requirements

- Responsive desktop-first admin shell.
- Search, filters, pagination, and visible active/inactive states.
- Inline validation.
- Confirmation for destructive actions.
- Optimistic list updates only when rollback is safe.
- Skeletons instead of page-blocking spinners.

## Performance requirements

- Paginate users and audit-heavy lists.
- Cache categories, stations, and settings briefly.
- Return compact list DTOs.
- Use image thumbnails, not original uploads.

## Exit gate

An administrator can configure a complete demo restaurant without database editing or developer assistance.

---

## Source file: `10_WAITER_FLOOR_VIEW_AND_TABLE_OPENING.md`

---
title: Waiter Floor View and Table Opening
order: 10
phase: ordering-loop
status: not-started
---

# Waiter Floor View and Table Opening

## Objective

Let a waiter identify a table and open or resume its ticket with minimal delay.

## Floor view

Display tables grouped by zone. Each card shows:

- Table label.
- Seat count.
- Free or occupied state.
- Current ticket number when occupied.
- Elapsed time since opening.
- READY item indicator when applicable.

## Interaction rules

### Free table

Tap opens a small guest-count sheet. Confirming creates the ticket and navigates directly to ordering.

### Occupied table

Tap opens the current live ticket. The server must verify the user has access and return the authoritative ticket.

## Open-ticket service

`openTicketForTable()` must:

1. Verify `order:create`.
2. Validate table is active.
3. Atomically ensure no OPEN ticket exists.
4. Allocate a sequential ticket number.
5. Create the ticket.
6. Mark the table occupied with `currentTicketId`.
7. Write an audit event when policy requires.
8. Return a compact ticket DTO.

Use a transaction when available. The partial unique index remains the final concurrency guard.

## API

```text
GET  /api/tables?zone=&status=
POST /api/tickets
GET  /api/tickets/:id
```

## Speed requirements

- Cache static table metadata, but keep occupancy live.
- Update only changed table cards after real-time events.
- Use a compact payload.
- Keep the floor view usable on slow Wi-Fi after its first load.

## Modern mobile UX

- One-column or two-column cards depending on width.
- 48px minimum touch targets.
- Sticky zone tabs.
- Clear free/occupied color plus text and icon; never rely on color alone.
- Immediate pressed state and optimistic navigation shell.
- Offline banner when disconnected.

## Error handling

If two waiters open the same table at nearly the same time, one request succeeds. The second receives the existing ticket and a message such as: “This table was opened by another staff member. The current ticket is now displayed.”

## Tests

- Free table opens once.
- Concurrent open requests do not create duplicates.
- Occupied table resumes.
- Inactive table cannot open.
- Unauthorized user receives 403.

## Exit gate

On a mid-range phone, a waiter can move from login to an open order screen in a few clear taps without a full-page refresh.

---

## Source file: `11_ORDER_COMPOSER_MODIFIERS_NOTES_AND_TOTALS.md`

---
title: Order Composer, Modifiers, Notes, and Totals
order: 11
phase: ordering-loop
status: not-started
---

# Order Composer, Modifiers, Notes, and Totals

## Objective

Create the fastest possible waiter ordering interface while keeping server totals authoritative.

## Screen structure

1. Sticky ticket header with table, ticket number, and guest count.
2. Search field.
3. Sticky horizontal category tabs.
4. Compact menu item grid or list.
5. Item customization sheet.
6. Persistent bottom cart bar with item count and estimated total.
7. Review-and-fire screen or drawer.

## Item interaction

A simple item with no modifiers can be added in one tap. An item with modifiers opens a bottom sheet containing:

- Quantity stepper.
- Required and optional modifier groups.
- Note field with quick note chips.
- Add or update button.

## Client state

Use Zustand only for the unsent local draft cart. Persist it by ticket ID in session storage so a browser refresh does not immediately lose work. Clear the draft only after the server acknowledges the fire request.

## Validation

Validate modifier group rules on both client and server. Reject unavailable or inactive items during submission even if they remain in a stale client cache.

## Totals

The client may show an estimate. The server must:

1. Load current menu items and modifiers.
2. Ignore client prices.
3. Calculate each line in minor units.
4. Create snapshots.
5. Recompute ticket totals.
6. Return authoritative totals.

## Duplicate-submission protection

Generate a `clientMutationId` for each fire action. The server must treat repeated requests with the same ID and ticket scope as the same operation.

## UX speed rules

- Prefetch menu after login or floor-view load.
- Keep category switching local after initial fetch.
- Use text-first cards; defer nonessential images.
- Do not animate large layout changes.
- Keep customization transitions around 150-200ms.
- Keep the primary fire button visible when the cart is non-empty.

## Accessibility

- Quantity controls have labels.
- Modifier groups expose required state.
- The bottom sheet traps and restores focus correctly.
- Notes have a useful character limit and remaining count.

## Tests

- Required modifier validation.
- Server ignores manipulated price.
- Unavailable item rejected with actionable response.
- Draft preserved across refresh.
- Repeated `clientMutationId` does not duplicate lines.

## Exit gate

A waiter can add common items rapidly, review the order, and submit without navigating through multiple pages.

---

## Source file: `12_FIRE_TO_STATION_DOMAIN_SERVICE.md`

---
title: Fire-to-Station Domain Service
order: 12
phase: ordering-loop
status: not-started
---

# Fire-to-Station Domain Service

## Objective

Implement the central business operation that validates a submitted draft, creates snapshots, updates totals, and routes each line to the correct station.

## Service signature

```ts
fireOrderLines({
  actorId,
  ticketId,
  clientMutationId,
  items
}): Promise<FireOrderLinesResult>
```

## Required processing order

1. Authenticate and require `order:update`.
2. Resolve or create an idempotency record.
3. Load the ticket with a minimal projection.
4. Require ticket status OPEN.
5. Load all referenced menu items in one query.
6. Validate item availability and modifier selections.
7. Resolve the station from each stored menu item.
8. Calculate line totals in integer minor units.
9. Build immutable snapshots.
10. Insert all order lines in a batch.
11. Recompute or increment ticket totals atomically.
12. Store the idempotent response.
13. Publish station events after the database commit.
14. Return created lines grouped by station and authoritative totals.

## Avoid N+1 queries

Do not call `MenuItem.findById()` inside an item loop. Fetch all menu items with one `$in` query and map them by ID.

## Suggested order-line snapshot

```ts
{
  ticketId,
  menuItemId,
  nameSnapshot,
  priceSnapshotMinor,
  qty,
  modifiersSnapshot,
  note,
  stationId,
  stationTypeSnapshot,
  status: 'NEW',
  firedAt,
  lineTotalMinor,
  version: 1
}
```

## Event publication

Publish one compact event per affected station or one batched station event:

```ts
{
  ticketId,
  stationId,
  lineIds,
  tableLabel,
  firedAt,
  version
}
```

Station clients must then reconcile with a station queue fetch. This is more reliable and smaller than broadcasting fully populated documents.

## Failure behavior

- No partial successful response without a documented compensation path.
- If publishing fails after the write, store an outbox item or retry asynchronously.
- A repeated idempotency key returns the original result.

## Tests

- Kitchen and Bar items split correctly.
- Multiple items load in one menu query.
- Closed ticket rejected.
- Stale unavailable item rejected.
- Repeated submission creates no duplicates.
- Menu price change after firing does not change the line.

## Exit gate

A mixed order produces correct NEW lines at both stations, correct totals, and no duplicate lines under retry.

---

## Source file: `13_REALTIME_PROVIDER_CHANNELS_AND_RECONNECTION.md`

---
title: Real-Time Provider, Channels, and Reconnection
order: 13
phase: realtime
status: not-started
---

# Real-Time Provider, Channels, and Reconnection

## Objective

Deliver secure, reliable live updates without coupling domain code to one vendor.

## Provider interface

```ts
interface RealTimeProvider {
  publish(channel: string, event: string, payload: unknown): Promise<void>;
}
```

Create:

- `PusherRealTimeProvider` for the recommended serverless deployment.
- A test provider that records events.
- An interface compatible with a future Socket.IO adapter.

## Channel strategy

Use private channels:

```text
private-station-<stationId>
private-table-<tableId>
private-cashier
private-admin
private-user-<userId>
```

## Authorization endpoint

Create a channel authorization route. It must:

1. Authenticate the session.
2. Parse the requested channel.
3. Verify the user has permission for that channel.
4. For station channels, validate station type and scoped read permission.
5. Reject arbitrary channel names.

## Event contract

Use versioned names:

```text
line.created.v1
line.status-changed.v1
ticket.updated.v1
ticket.closed.v1
ticket.paid.v1
permissions.changed.v1
```

Payloads should include:

- Entity ID.
- New status or changed field.
- Entity version.
- Server timestamp.
- Correlation ID when useful.

## Client reliability

- Show connection status.
- Reconnect automatically.
- On reconnect or tab resume, re-fetch the authoritative queue or ticket.
- Deduplicate events by event ID or entity version.
- Ignore stale versions.
- Do not assume every event arrives.

## Publish-after-write rule

Never let a real-time event be the source of truth. Write to MongoDB first, then publish. For stronger reliability, implement an outbox collection processed after the response or by a scheduled worker.

## Performance rules

- Batch station notifications when one fire request creates several lines.
- Avoid large payloads and images.
- Do not broadcast to global channels when a station or table channel is sufficient.
- Use one shared client connection per browser tab.

## Tests

- Unauthorized channel subscription denied.
- Kitchen user cannot subscribe to Bar station.
- Reconnect triggers REST reconciliation.
- Stale event does not overwrite newer state.
- Publish failure does not roll back an already successful order without an explicit strategy.

## Exit gate

Station, waiter, cashier, and admin clients receive only authorized events and recover correctly after a temporary connection loss.

---

## Source file: `14_KITCHEN_AND_BAR_DISPLAY_SYSTEMS.md`

---
title: Kitchen and Bar Display Systems
order: 14
phase: station-ui
status: not-started
---

# Kitchen and Bar Display Systems

## Objective

Provide fast, high-contrast station screens that make preparation status obvious and require one tap per transition.

## Shared station component

Build one station display feature configured by the authenticated station and permissions. Do not create duplicated Kitchen and Bar codebases.

## Queue query

```text
GET /api/stations/:stationId/queue?status=NEW,PREPARING&cursor=
```

Return grouped ticket cards with compact line DTOs. Use the compound `stationId + status + firedAt` index.

## Ticket card content

- Table label and ticket number.
- Time since first active line fired.
- Item name, quantity, modifiers, and note.
- Current status.
- One clear next action.
- Round or fired-at grouping when more items are added later.

## Status actions

- NEW -> Start -> PREPARING.
- PREPARING -> Ready -> READY.
- READY is removed from the active preparation queue or moved to a recently-ready lane.

Use an optimistic visual transition, disable duplicate taps, and roll back on server failure.

## Aging behavior

Use configurable thresholds:

- Normal.
- Warning.
- Urgent.

Provide color, label, and elapsed time. Never use color alone.

## Layout

- Desktop and landscape tablet first.
- Large touch targets of at least 48px.
- Dense but readable ticket grid.
- Optional focused lanes: New, Preparing, Recently Ready.
- Full-screen mode.
- Clear offline and reconnecting banners.

## Audio

A new-line sound is optional and user-configurable. Respect browser autoplay restrictions. Show a visible new-ticket cue even when audio cannot play.

## Speed requirements

- Virtualize only when the active queue is genuinely large; avoid unnecessary complexity.
- Update one line or ticket card rather than re-rendering the entire grid.
- Use memoized selectors.
- Keep timers local and update displayed elapsed time at a reasonable interval, not every animation frame.

## Tests

- Correct station filtering.
- One-tap transitions.
- Forbidden transition rejected.
- Duplicate tap does not advance twice.
- New round appears under the correct ticket.
- Queue re-sync after reconnect.

## Exit gate

A station worker can identify new work, notes, age, and the next action at a glance from several feet away.

---

## Source file: `15_WAITER_LIVE_TICKET_READY_ALERTS_AND_SERVING.md`

---
title: Waiter Live Ticket, READY Alerts, and Serving
order: 15
phase: ordering-loop
status: not-started
---

# Waiter Live Ticket, READY Alerts, and Serving

## Objective

Give the waiter a live, accurate ticket view and a clear pickup workflow.

## Live ticket sections

- Ticket summary and running authoritative total.
- Lines grouped by fired round or time.
- Status badge on every line.
- READY pickup area pinned near the top.
- Actions: Add More, Mark Served, Close Ticket.

## READY alert behavior

When a line becomes READY:

1. Apply the event only when its version is newer.
2. Add the line to the pickup area.
3. Show a persistent banner with table and item names.
4. Play a short sound and optional haptic-style animation when enabled.
5. Keep the alert visible until acknowledged or served.
6. Re-fetch the ticket in the background.

Avoid transient toasts as the only READY notification.

## Mark served

The waiter can mark individual READY lines as SERVED. The server must validate:

- Ticket access.
- Current status is READY.
- The requested transition is legal.
- Actor has the required permission.

## Add more

The Add More action returns to the order composer with the same OPEN ticket. New lines create a new fired round and route normally.

## Close ticket guard

Before closing, show:

- Any NEW or PREPARING lines.
- Any READY lines not served.
- Current total.

Policy may allow closing with unfinished lines only after explicit confirmation and elevated permission. The safe default is to block and explain why.

## Performance

- Subscribe only to the current table and user channels.
- Patch local line status from events, then reconcile.
- Avoid re-downloading menu data for every ticket status update.
- Keep the live view mounted while a bottom sheet opens.

## Tests

- READY alert only reaches the relevant table or waiter.
- Alert persists until handled.
- Stale event ignored.
- Served transition is legal only from READY.
- Add More creates a new round on the same ticket.

## Exit gate

The waiter can immediately identify exactly which items are ready, where they belong, and whether the table can be closed.

---

## Source file: `16_TICKET_CLOSURE_AND_CASHIER_QUEUE.md`

---
title: Ticket Closure and Cashier Queue
order: 16
phase: cashier
status: not-started
---

# Ticket Closure and Cashier Queue

## Objective

Create a safe handoff from waiter operations to cashier settlement.

## Close-ticket service

`closeTicket()` must:

1. Require `order:close`.
2. Load the ticket and active line summary.
3. Require ticket status OPEN.
4. Apply policy for unfinished or unserved lines.
5. Recompute final pre-payment totals.
6. Atomically change status to CLOSED and set `closedAt`.
7. Write an audit entry.
8. Publish `ticket.closed.v1` to the cashier channel.
9. Return the cashier-ready ticket summary.

Do not free the table on CLOSE. The table remains occupied until PAID or an authorized cancellation flow resolves it.

## Cashier queue

```text
GET /api/cashier/queue?cursor=&zone=&waiter=
```

Show:

- Ticket number.
- Table.
- Waiter.
- Closed time and waiting duration.
- Guest count.
- Current total.
- Payment state.

Sort oldest waiting tickets first by default.

## Queue UX

- Split view on desktop: queue left, bill details right.
- Fast search by ticket number or table.
- Live insertion when a ticket closes.
- Clear selected state.
- Empty state that confirms the queue is clear.
- Visible offline/reconnecting state.

## Concurrency

When two cashiers open the same ticket, both may view it, but payment settlement must remain idempotent and server-guarded. Show “Paid by another cashier” and refresh if another terminal completes payment.

## Tests

- Close changes OPEN to CLOSED.
- Closed ticket rejects additional lines.
- Cashier receives live event.
- Table remains occupied until payment.
- Repeated close request returns safe result without duplicate events.

## Exit gate

A waiter can close a ticket once, and the cashier queue displays it immediately with correct totals.

---

## Source file: `17_BILLING_DISCOUNTS_TAX_PAYMENTS_AND_IDEMPOTENCY.md`

---
title: Billing, Discounts, Tax, Payments, and Idempotency
order: 17
phase: cashier
status: not-started
---

# Billing, Discounts, Tax, Payments, and Idempotency

## Objective

Settle tickets accurately and exactly once.

## Billing rules

Calculate in this explicit order and document the restaurant policy:

1. Sum non-VOID order-line totals.
2. Apply approved discount.
3. Apply service charge.
4. Apply tax.
5. Produce final total.

Use basis points for percentage configuration and integer minor units for all values. Define rounding in one shared function.

## Discount model

Support a controlled first release:

- Fixed amount.
- Percentage with maximum optional cap.
- Required reason.
- Permission threshold for large discounts.

Do not allow arbitrary client-calculated totals.

## Payment request

```ts
{
  idempotencyKey,
  method: 'cash' | 'card' | 'other',
  tenderedMinor,
  discount,
  serviceCharge,
  tax
}
```

## Settle-ticket service

1. Require `payment:create`.
2. Resolve the idempotency key.
3. Load CLOSED ticket and line snapshots.
4. Recalculate the bill on the server.
5. Validate tendered amount for cash.
6. Create payment record.
7. Change ticket to PAID and set `paidAt`.
8. Free the table and clear `currentTicketId`.
9. Write audit log.
10. Store the idempotent result.
11. Publish `ticket.paid.v1`.
12. Return payment and receipt data.

Use a transaction when available. Retain unique or logical guards that prevent two payments even if retries occur.

## Cash UX

- Large numeric keypad on touch devices.
- Quick tender buttons.
- Automatic change calculation.
- Clear total, tendered, and change hierarchy.
- Confirm before final settlement.
- Disable the final button during submission.
- On timeout, query payment status before allowing retry.

## Tests

- Correct rounding.
- Fixed and percentage discounts.
- Double-click does not create two payments.
- Network retry with same key returns same result.
- Simultaneous cashier attempts settle once.
- PAID ticket frees table exactly once.

## Exit gate

Financial calculations are deterministic, fully tested, and impossible to settle twice through normal or retried requests.

---

## Source file: `18_RECEIPT_PRINTING_PDF_AND_EMAIL.md`

---
title: Receipt Printing, PDF, and Email
order: 18
phase: cashier
status: not-started
---

# Receipt Printing, PDF, and Email

## Objective

Generate a stable receipt from ticket and payment snapshots without depending on current menu data.

## Receipt content

- Restaurant name and contact details.
- Ticket number.
- Table and waiter.
- Opened, closed, and paid timestamps.
- Item name snapshots, quantity, modifiers, and line totals.
- Subtotal, discount, service charge, tax, total.
- Payment method, tendered amount, and change when relevant.
- Cashier.
- Configurable footer.

## Data source

Build receipt data from:

- Ticket snapshot totals.
- Order-line snapshots.
- Payment record.
- Restaurant settings snapshot or versioned settings.

Never re-price using the current menu.

## Output modes

1. Browser print stylesheet for thermal or A4 printing.
2. Downloadable PDF.
3. Optional email receipt after payment.

## Print UX

- Open print view immediately after successful payment.
- Provide Print, Download PDF, and Done actions.
- Do not block payment success if email or PDF generation fails.
- Allow reprint only with `receipt:print` and audit repeated prints if required.

## Performance

- Generate the lightweight HTML receipt immediately.
- Create PDF on demand rather than during every payment unless operationally required.
- Keep logos optimized and embedded at an appropriate size.
- Avoid remote image dependencies in the printable output.

## Tests

- Receipt total matches payment total.
- Menu price changes do not alter an old receipt.
- VOID lines are excluded or clearly represented according to policy.
- Reprint works for PAID ticket.
- PDF failure does not reverse payment.

## Exit gate

The cashier can print or download a readable, accurate receipt immediately after payment and later reprint it from history.

---

## Source file: `19_REPORTS_AND_AUDIT_LOGS.md`

---
title: Reports and Audit Logs
order: 19
phase: operations
status: not-started
---

# Reports and Audit Logs

## Objective

Provide operational visibility without slowing transaction workflows.

## First-release reports

- Sales by day.
- Sales by menu item.
- Sales by station or category.
- Sales by waiter.
- Payment method summary.
- Average ticket value.
- Preparation duration from fired to ready.
- Void and cancellation summary.

## Query design

- Report from PAID tickets and stored snapshots.
- Use date range filters with a bounded maximum.
- Add indexes for common time and status filters.
- Use aggregation pipelines with projections early.
- Paginate detailed results.
- Do not run large report aggregations on every dashboard render.

## Summary caching

For one restaurant, calculate recent summaries on demand and cache briefly. If data volume grows, create daily summary documents updated after payment.

## Audit events

At minimum record:

- Login security events when appropriate.
- User activation/deactivation.
- Role and permission edits.
- Table opening and ticket closure when required.
- Line void with reason.
- Ticket cancellation with reason.
- Discount approval.
- Payment and reprint.

Suggested audit fields:

```ts
{
  actorId,
  action,
  entity,
  entityId,
  meta,
  requestId,
  ipHash,
  at
}
```

Do not store passwords, tokens, card details, or unnecessary personal data in `meta`.

## Admin UX

- Date range picker with presets.
- Clear totals and trend cards.
- Tables with sorting, search, pagination, and export when approved.
- Audit detail drawer showing before/after summaries for sensitive edits.

## Tests

- Cancel and void actions create audit entries.
- Reports include only PAID tickets where intended.
- Date boundaries and timezone are correct.
- Large result requests are bounded.

## Exit gate

Managers can explain daily sales and trace sensitive operational changes without direct database access.

---

## Source file: `20_MODERN_UI_UX_DESIGN_SYSTEM.md`

---
title: Modern UI and UX Design System
order: 20
phase: experience
status: not-started
---

# Modern UI and UX Design System

## Objective

Create a modern, friendly interface that improves service speed rather than adding visual complexity.

## Design principles

1. Operational clarity before decoration.
2. One obvious primary action per context.
3. Large touch targets and short paths.
4. Consistent status language across all personas.
5. Immediate feedback for every tap.
6. Progressive disclosure for advanced controls.
7. Motion must explain change, not delay work.

## Responsive targets

- Waiter: 360-430px phone widths first.
- Station: landscape tablet and 1366px or larger displays.
- Cashier: tablet and desktop.
- Admin: desktop first, responsive to tablet.

## Token system

Define CSS variables for:

- Brand accent.
- Neutral surfaces and borders.
- Text hierarchy.
- Success, warning, danger, and information.
- Radius, shadow, spacing, and motion duration.

Keep status semantics consistent:

```text
Free / Ready / Paid       success
Preparing / attention     warning
Aging / destructive       danger
New / informational       info
```

Use labels and icons in addition to color.

## Typography

- Use one highly legible interface family.
- Avoid decorative fonts on operational screens.
- Station item names and quantities must be readable at distance.
- Use tabular numerals for money and timers.

## Core reusable components

- Role-aware `AppShell`.
- `StatusBadge`.
- `MoneyText`.
- `ElapsedTimer`.
- `ActionButton` with loading and success states.
- `ConfirmActionDialog`.
- `ConnectionBanner`.
- `EmptyState`, `ErrorState`, and skeletons.
- `PermissionGate` for presentation only.

## Motion

- 150-200ms for sheets, drawers, and state changes.
- Respect `prefers-reduced-motion`.
- Never animate the entire KDS grid on each event.
- Use subtle scale or highlight for newly updated cards.

## Friendly error language

Bad: “Mutation failed: 409.”

Good: “This table already has an open ticket. The current ticket has been loaded.”

Every recoverable error should include a retry or next action.

## Accessibility

- WCAG AA contrast.
- Keyboard navigation for cashier and admin.
- Focus management in dialogs and sheets.
- Screen-reader labels for icon buttons.
- Live regions for READY alerts and important status changes.
- No destructive action without confirmation.

## UX acceptance targets

- New waiter productive within five minutes.
- Common order fired in under 15 seconds.
- Primary actions available in at most two taps from the current context.
- No silent failures.
- No page reload required for operational updates.

## Exit gate

A design review confirms consistency across waiter, station, cashier, and admin workspaces, including loading, empty, error, offline, and permission states.

---

## Source file: `21_PERFORMANCE_AND_SPEED_OPTIMIZATION.md`

---
title: Performance and Speed Optimization
order: 21
phase: performance
status: not-started
---

# Performance and Speed Optimization

## Objective

Make speed a measurable product feature across database, server, network, rendering, and interaction layers.

## Performance budgets

Use these as initial targets and measure on real devices:

- Waiter first useful screen: under 2.5 seconds on a typical mobile connection after authentication.
- Optimistic button response: under 100ms perceived.
- Common API mutation p95: under 500ms excluding cold-start anomalies.
- Indexed database query p95: under 100ms in normal load testing.
- Initial JavaScript per role workspace: keep as small as practical; avoid loading admin code in waiter routes.
- No layout shift caused by menu images or ticket cards.

## Database speed

- Create indexes before production data grows.
- Use `.lean()` and projections.
- Avoid N+1 reads and broad `populate()`.
- Batch order-line inserts.
- Use cursor pagination.
- Store snapshots to reduce joins.
- Bound report date ranges.
- Inspect explain plans for hot queries.

## API speed

- Validate once with shared Zod schemas.
- Keep handlers thin.
- Parallelize independent reads with `Promise.all` only when safe.
- Use idempotency records rather than expensive duplicate detection.
- Return compact DTOs.
- Move noncritical audit enrichment or email work after the response when the platform supports it.

## Next.js speed

- Split route groups by persona so clients do not download unrelated UI.
- Prefer Server Components for static shells and reference data.
- Use Client Components only for interaction.
- Explicitly cache menu categories, stations, and safe settings with controlled revalidation.
- Remember that Next.js 15 GET Route Handlers are dynamic by default.
- Lazy-load report charts, PDF generation, and admin-only editors.

## Client data strategy

TanStack Query:

- Use sensible `staleTime` for menu and settings.
- Invalidate the smallest relevant query key.
- Patch real-time status changes locally and reconcile in the background.
- Avoid refetch storms after several events.

Zustand:

- Use selectors to prevent broad re-renders.
- Keep only transient draft state.
- Do not duplicate server state permanently.

## Image speed

- Use optimized WebP or AVIF thumbnails.
- Provide dimensions to prevent layout shift.
- Load images below the fold lazily.
- Make menu usable without images.
- Keep KDS free from unnecessary photography.

## Real-time speed

- Use one browser connection.
- Publish compact events.
- Batch related station notifications.
- Subscribe only to relevant channels.
- Reconcile after reconnect instead of replaying an unbounded event history.

## UX performance

- Use skeletons for predictable content shapes.
- Keep controls enabled when safe through optimistic updates.
- Prevent accidental double taps.
- Avoid full-screen spinners for localized operations.
- Preserve scroll and draft state during background refresh.

## Measurement

Add:

- Web Vitals collection.
- Server timing for major services.
- Structured logs containing route, duration, query count, and request ID.
- k6 scenarios for simultaneous waiter fires and station updates.

## Mandatory performance tests

- 10 waiters firing mixed orders concurrently.
- 2 station screens receiving updates.
- 2 cashiers viewing the queue.
- Reconnect storm after network interruption.
- Report query against representative historical data.

## Exit gate

No known unindexed hot query, N+1 station routing, oversized real-time payload, or cross-persona bundle leakage remains before release.

---

## Source file: `22_PWA_OFFLINE_BEHAVIOR_AND_RECOVERY.md`

---
title: PWA, Offline Behavior, and Recovery
order: 22
phase: resilience
status: not-started
---

# PWA, Offline Behavior, and Recovery

## Objective

Make the waiter experience installable and resilient without creating unsafe offline financial behavior.

## PWA scope

Cache:

- Application shell.
- Fonts and icons.
- Recent menu and category data.
- Static table metadata.

Do not treat cached operational state as authoritative.

## Offline policy

### Allowed offline

- View the last cached menu.
- Build a local draft order.
- View a clearly marked last-known ticket snapshot.

### Not automatically committed offline

- Opening a table.
- Firing order lines.
- Closing a ticket.
- Advancing station status.
- Recording payment.

These actions require server confirmation because duplicates or conflicts are operationally dangerous.

## Reconnection workflow

1. Show an offline banner immediately.
2. Preserve local draft with its ticket context.
3. On reconnect, reauthenticate if necessary.
4. Fetch the current table, ticket, and menu versions.
5. Detect conflicts such as a closed ticket or unavailable item.
6. Let the waiter review changes.
7. Submit with a new or preserved idempotency key.

## Install UX

- Provide a manifest, icons, and theme colors.
- Show an install suggestion only after the user has engaged with the app.
- Do not repeatedly interrupt staff.
- Support full-screen standalone mode.

## Device behavior

- Keep critical controls above safe-area insets.
- Avoid dependence on hover.
- Prevent screen sleep on station displays when permitted and enabled.
- Handle browser audio permission explicitly.

## Tests

- App shell opens after a network loss.
- Draft survives refresh.
- Offline mutation is blocked with clear explanation.
- Reconnect detects a closed ticket conflict.
- Duplicate submit after reconnection is prevented by idempotency.

## Exit gate

Network loss is visible, drafts are protected, and no offline behavior can silently create duplicate or financially inconsistent operations.

---

## Source file: `23_SECURITY_DATA_INTEGRITY_AND_ABUSE_PROTECTION.md`

---
title: Security, Data Integrity, and Abuse Protection
order: 23
phase: security
status: not-started
---

# Security, Data Integrity, and Abuse Protection

## Objective

Protect staff accounts, financial operations, real-time channels, and stored data.

## Authentication security

- Bcrypt password hashing with measured cost at or above the approved baseline.
- Hashed PINs with lockout.
- Generic login errors.
- Secure cookies and HTTPS.
- Session invalidation for deactivated users and password resets.
- Rate limiting for login and PIN attempts.

## Authorization security

- Server-side permission guard on every protected route.
- Station-scoped checks based on stored line station.
- Private real-time channels with server authorization.
- No trust in client-hidden buttons.

## Input protection

- Zod validation for body, params, and query strings.
- Length limits for names, notes, and reasons.
- Escape rendered user-entered content.
- Reject unknown fields on sensitive requests.
- Avoid building Mongo query operators from raw client objects.

## Financial integrity

- Integer money.
- Server-calculated totals.
- Price and name snapshots.
- Idempotent payment.
- Audit discounts, voids, cancellations, and reprints.
- Never store full card data; record only safe payment metadata.

## State integrity

- Enforce legal status transitions in one domain module.
- Use entity versioning or optimistic concurrency for contested updates.
- Use unique and partial indexes for invariants.
- Use transactions where appropriate, with logical guards as backup.

## Logging and privacy

Never log:

- Passwords or PINs.
- Session tokens.
- Pusher secrets.
- MongoDB credentials.
- Full payment card details.

Redact sensitive request fields and use request IDs for tracing.

## Security tests

- Unauthenticated request.
- Wrong permission.
- Cross-station line update.
- Subscription to unauthorized channel.
- NoSQL operator injection attempt.
- Duplicate payment.
- Stale status update.
- Inactive account with old session.

## Exit gate

A security review finds no client-only authorization, plaintext secrets, unvalidated mutation input, illegal status bypass, or non-idempotent settlement path.

---

## Source file: `24_TESTING_QA_AND_CRITICAL_SCENARIOS.md`

---
title: Testing, QA, and Critical Scenarios
order: 24
phase: quality
status: not-started
---

# Testing, QA, and Critical Scenarios

## Test layers

### Unit tests with Vitest

Cover:

- Money and rounding.
- Ticket totals.
- Status transition rules.
- Permission union.
- Station routing.
- Discount policy.
- DTO mapping.

### Integration tests

Use a test MongoDB environment or `mongodb-memory-server` when compatible. Cover route handlers, services, indexes, and idempotency.

### End-to-end tests with Playwright

Use separate authenticated browser contexts for waiter, Kitchen, Bar, cashier, and admin.

### Load tests with k6

Test concurrent order firing, station queue reads, real-time reconciliation, and payment contention.

## Critical acceptance scenarios

1. A Kitchen item and Bar item on one ticket route to the correct two screens.
2. Marking a Bar line READY alerts only the relevant waiter/table.
3. Additional lines on an OPEN ticket route correctly as a later round.
4. A Bar user cannot advance a Kitchen line.
5. A user with Waiter and Bar roles can use both workspaces.
6. Closing a ticket blocks new items and inserts it into the cashier queue.
7. Payment marks the ticket PAID, frees the table, and produces matching receipt totals.
8. A Super Admin edits a role and access changes without a code deployment.
9. A repeated fire request does not duplicate order lines.
10. A repeated payment request does not create a second payment.
11. A lost real-time connection is repaired by REST re-sync.
12. A menu price change does not alter an already-fired line or old receipt.

## UX QA

Test:

- 360px phone.
- Landscape tablet.
- Standard desktop.
- Keyboard-only cashier/admin use.
- Reduced motion.
- Slow network.
- Offline and reconnecting states.
- Long item names and notes.
- Empty, loading, error, and permission-denied states.

## Test data

Create deterministic seed data with:

- At least two stations.
- Multiple categories and modifiers.
- Free and occupied tables.
- Multi-role user.
- Closed and paid tickets.
- Aging station lines.

## Exit gate

All critical scenarios pass in CI and a manual smoke test passes on actual target devices.

---

## Source file: `25_OBSERVABILITY_BACKUPS_AND_OPERATIONAL_RUNBOOK.md`

---
title: Observability, Backups, and Operational Runbook
order: 25
phase: operations
status: not-started
---

# Observability, Backups, and Operational Runbook

## Objective

Make failures visible, recoverable, and understandable to the restaurant operator.

## Structured logging

Every request should have a request ID. Log:

- Route and method.
- Actor ID when safe.
- Result status.
- Duration.
- Domain operation.
- Error code.
- Real-time publish result.

Do not log secrets or full sensitive payloads.

## Error monitoring

Configure an error-monitoring service or equivalent free-compatible solution. Tag errors by:

- Environment.
- Release.
- Persona.
- Route.
- Request ID.

## Health endpoints

Create:

```text
GET /api/health/live
GET /api/health/ready
```

Readiness should perform a bounded database check and optionally verify the real-time provider configuration without creating excessive external calls.

## Business monitoring

Track:

- Order fire failures.
- Real-time publish failures.
- Station queue age.
- Payment retries and conflicts.
- Database connection errors.
- Client reconnect rates.

## Backup policy

Do not assume managed snapshots are available on a free database cluster.

Implement:

- Scheduled encrypted `mongodump` or approved export.
- Separate private storage destination.
- Retention policy.
- Backup success alert.
- Monthly restore test into a non-production database.
- Written restore steps.

A backup is not valid until a restore has been tested.

## Operational runbook

Document:

- Add, deactivate, and reset a staff account.
- Change a role safely.
- Recover from unavailable real-time service.
- Switch to temporary polling mode.
- Restore a database backup.
- Resolve a stuck CLOSED ticket.
- Investigate a suspected duplicate payment.
- Rotate secrets.
- Roll back a deployment.

## Exit gate

An operator can identify service health, receive failure alerts, and follow a tested restore procedure without relying on undocumented developer knowledge.

---

## Source file: `26_CI_CD_DEPLOYMENT_AND_ENVIRONMENT_PROMOTION.md`

---
title: CI/CD, Deployment, and Environment Promotion
order: 26
phase: deployment
status: not-started
---

# CI/CD, Deployment, and Environment Promotion

## Objective

Provide repeatable deployment from pull request to production.

## Environments

```text
Local -> Pull Request Preview -> Staging/Preview -> Production
```

Use isolated database names and secrets.

## GitHub Actions pipeline

On pull request and push to the main branch, run:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Run Playwright against a deployed preview or controlled test environment for release candidates.

## Deployment baseline

Recommended first release:

- Next.js on Vercel.
- MongoDB Atlas Free cluster for the initial small deployment.
- Pusher private channels for real-time.
- Cloudinary or equivalent for optimized menu images.

Keep the real-time provider abstract so the application can move to Socket.IO or another provider later.

## Database deployment safety

1. Run backward-compatible migrations before code that requires them.
2. Deploy application code.
3. Verify health and smoke tests.
4. Remove old fields only in a later release.

## Release metadata

Expose or log:

- Git commit SHA.
- Build time.
- Environment.
- Schema migration version.

## Smoke test after deployment

- Login.
- Open a table.
- Fire one Kitchen and one Bar item.
- Advance both lines.
- Confirm waiter alert.
- Close ticket.
- Pay and confirm table is free.
- Open receipt.
- Confirm admin can view the audit trail.

## Rollback

Document the previous working deployment, database compatibility, and migration rollback or forward-fix strategy. Never roll back code blindly after an irreversible schema migration.

## Exit gate

A production deployment can be reproduced from source control, automatically validated, smoke-tested, and safely rolled back or forward-fixed.

---

## Source file: `27_RELEASE_ACCEPTANCE_AND_HANDOVER.md`

---
title: Release Acceptance and Handover
order: 27
phase: release
status: not-started
---

# Release Acceptance and Handover

## Release readiness checklist

### Business workflow

- [ ] Waiter opens or resumes a table.
- [ ] Mixed order routes correctly.
- [ ] KDS and BDS status changes are live.
- [ ] READY alert is persistent and targeted.
- [ ] Additional rounds work on the same ticket.
- [ ] Close blocks further ordering.
- [ ] Cashier queue receives closed ticket.
- [ ] Payment is idempotent.
- [ ] Receipt totals match snapshots.
- [ ] PAID frees the table.

### Access control

- [ ] Every mutation has a server permission guard.
- [ ] Station scope is enforced.
- [ ] Multi-role permission union works.
- [ ] Role edits take effect promptly.
- [ ] Inactive users lose access.

### UX

- [ ] Waiter common order takes under 15 seconds.
- [ ] Target device layouts pass.
- [ ] Loading, empty, error, offline, and reconnecting states exist.
- [ ] Touch targets and keyboard paths pass.
- [ ] Destructive operations confirm and explain impact.

### Performance

- [ ] Hot queries use indexes.
- [ ] No N+1 station routing.
- [ ] Real-time events are compact.
- [ ] Role-based route bundles do not include unrelated heavy features.
- [ ] Load test meets agreed budgets.

### Security and operations

- [ ] Password and PIN hashes only.
- [ ] Secrets are absent from repository and client bundle.
- [ ] Payment and order submissions use idempotency.
- [ ] Audit records exist for sensitive actions.
- [ ] Backup and restore are tested.
- [ ] Health checks and monitoring are active.

## Handover package

Provide:

- Architecture documentation and ADRs.
- Environment variable inventory.
- Admin user guide.
- Waiter quick-start guide.
- Kitchen and Bar quick-start guide.
- Cashier quick-start guide.
- Backup and restore runbook.
- Deployment and rollback runbook.
- Test report and known limitations.
- Source code and lockfile.

## Training

Run role-based sessions using a demo order from open to payment. Keep training task-oriented and under 30 minutes per role.

## Final acceptance

The restaurant owner or nominated manager must sign off after a live operational simulation with all personas connected simultaneously.

---

## Source file: `28_OPTIONAL_ENHANCEMENTS_AFTER_CORE_RELEASE.md`

---
title: Optional Enhancements After Core Release
order: 28
phase: later
status: blocked-until-core-release
---

# Optional Enhancements After Core Release

Do not begin these until the core release is stable and measured.

## Recommended order

1. Table transfer.
2. Merge tables.
3. Split bill and multiple payments.
4. Manager approval workflows.
5. Guest QR self-order.
6. Kitchen printer integration.
7. Inventory tracking.
8. Shift management.
9. Loyalty.
10. Multi-branch tenancy.

## Design requirements for later features

- Preserve order-line snapshots.
- Extend payment model before enabling split bills; do not overload the first-release one-payment assumptions.
- Add tenant or branch identifiers to every relevant collection before multi-branch rollout.
- Use feature flags for operationally risky additions.
- Add migration, rollback, permission, audit, performance, and acceptance plans for each enhancement.

## Enhancement gate template

Before implementation, document:

- Business problem.
- New personas or permissions.
- Data model changes.
- API changes.
- Real-time changes.
- UI flow.
- Failure modes.
- Backward compatibility.
- Performance impact.
- Tests and acceptance criteria.

## Exit rule

An enhancement is not approved merely because it is technically possible. It must reduce operational effort, improve guest service, or produce a measurable business benefit without destabilizing the core ordering loop.

---

## Source file: `29_REFERENCE_CONTRACTS_STATUSES_PERMISSIONS_AND_ENDPOINTS.md`

---
title: Reference Contracts - Statuses, Permissions, Endpoints, and Events
order: 29
phase: reference
status: ready
---

# Reference Contracts

## Ticket status

```ts
export const TicketStatus = ['OPEN', 'CLOSED', 'PAID', 'CANCELLED'] as const;
```

## Order-line status

```ts
export const LineStatus = ['NEW', 'PREPARING', 'READY', 'SERVED', 'VOID'] as const;
```

## Permissions

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

## Core endpoints

```text
POST   /api/auth/login
GET    /api/menu
POST   /api/menu/items
GET    /api/tables
POST   /api/tickets
GET    /api/tickets/:id
POST   /api/tickets/:id/lines
PATCH  /api/lines/:id/status
POST   /api/tickets/:id/close
GET    /api/cashier/queue
POST   /api/tickets/:id/pay
GET    /api/tickets/:id/receipt
POST   /api/roles
PATCH  /api/roles/:id
POST   /api/users
GET    /api/reports/sales
POST   /api/realtime/auth
```

## Standard response envelope

Success:

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Error:

```json
{
  "error": {
    "code": "TICKET_NOT_OPEN",
    "message": "This ticket is no longer open.",
    "details": {}
  },
  "meta": {
    "requestId": "..."
  }
}
```

## Event names

```text
line.created.v1
line.status-changed.v1
ticket.updated.v1
ticket.closed.v1
ticket.paid.v1
permissions.changed.v1
```

## Recommended error codes

```text
UNAUTHENTICATED
FORBIDDEN
VALIDATION_FAILED
RESOURCE_NOT_FOUND
TABLE_ALREADY_OPEN
TICKET_NOT_OPEN
ILLEGAL_STATUS_TRANSITION
MENU_ITEM_UNAVAILABLE
IDEMPOTENCY_CONFLICT
TICKET_ALREADY_PAID
PAYMENT_AMOUNT_INVALID
REALTIME_PUBLISH_FAILED
```

## Versioning rule

Breaking API or event changes require a new version. Additive fields may remain in the same version when clients safely ignore unknown fields.

---

## Source file: `30_REUSABLE_AI_AGENT_TASK_TEMPLATES.md`

---
title: Reusable AI Agent Task Templates
order: 30
phase: reference
status: ready
---

# Reusable AI Agent Task Templates

## Feature implementation prompt

```text
Read 00_README.md, 01_AI_AGENT_OPERATING_PROTOCOL.md, and guide <NUMBER>.
Inspect the current repository before editing.
Implement only the deliverables in guide <NUMBER>.
Preserve existing architecture and contracts.
Use strict TypeScript, shared Zod schemas, thin route handlers, domain services, server-side permission checks, compact DTOs, and tests.
Prioritize fast queries, small client bundles, friendly loading/error states, accessibility, and responsive modern UI.
Run lint, typecheck, tests, and build.
Update 31_PROGRESS_TRACKER.md and provide the required handoff summary.
```

## Bug-fix prompt

```text
Reproduce the issue first and add a failing test when practical.
Find the smallest root cause.
Do not perform unrelated refactors.
Verify authorization, idempotency, status transitions, and concurrency implications.
Measure whether the fix adds a new query, re-render, or real-time event.
Run relevant unit, integration, E2E, and build checks.
Document the root cause, changed files, test evidence, and remaining risk.
```

## Performance task prompt

```text
Measure before changing code.
Identify whether the bottleneck is database, server, network, rendering, image, or real-time behavior.
Inspect query explain plans and client bundle impact.
Make one controlled change at a time.
Preserve correctness and authorization.
Report baseline, change, final measurement, and any tradeoff.
```

## UI task prompt

```text
Use the existing design tokens and shadcn/ui patterns.
Do not introduce a parallel visual system.
Include loading, empty, error, offline, permission-denied, and success states.
Meet touch target, keyboard, contrast, focus, and reduced-motion requirements.
Keep transitions short and avoid animation that delays operational actions.
Test at the persona's target device sizes.
```

## Database change prompt

```text
Define the invariant and index first.
Create an idempotent migration.
Use minor units for money and snapshots for historical values.
Avoid unbounded reads and N+1 queries.
Add concurrency and rollback tests.
Document deployment order and recovery steps.
```

---

## Source file: `31_PROGRESS_TRACKER.md`

---
title: Progress Tracker
order: 31
status: active
---

# Progress Tracker

Update this file after every completed guide.

| Guide | Workstream | Status | Owner/Agent | Evidence | Notes |
|---:|---|---|---|---|---|
| 01 | Agent protocol | Not started | | | |
| 02 | Product scope | Not started | | | |
| 03 | Architecture | Not started | | | |
| 04 | Repository bootstrap | Not started | | | |
| 05 | Environments | Not started | | | |
| 06 | Database | Not started | | | |
| 07 | Authentication | Not started | | | |
| 08 | RBAC | Not started | | | |
| 09 | Admin core | Not started | | | |
| 10 | Waiter floor | Not started | | | |
| 11 | Order composer | Not started | | | |
| 12 | Fire-to-station | Not started | | | |
| 13 | Real-time | Not started | | | |
| 14 | KDS/BDS | Not started | | | |
| 15 | Waiter live ticket | Not started | | | |
| 16 | Ticket close/cashier queue | Not started | | | |
| 17 | Billing/payment | Not started | | | |
| 18 | Receipts | Not started | | | |
| 19 | Reports/audit | Not started | | | |
| 20 | UI/UX system | Not started | | | |
| 21 | Performance | Not started | | | |
| 22 | PWA/offline | Not started | | | |
| 23 | Security | Not started | | | |
| 24 | Testing/QA | Not started | | | |
| 25 | Operations/backups | Not started | | | |
| 26 | CI/CD/deployment | Not started | | | |
| 27 | Release/handover | Not started | | | |
| 28 | Optional enhancements | Blocked until core release | | | |

## Current phase

```text
Phase:
Guide:
Branch:
Agent:
Started:
Expected deliverables:
Blockers:
```

## Latest handoff

```text
Task:
Status:
Files changed:
Database changes:
API or event changes:
Tests:
Commands:
Known limitations:
Next guide:
```

---

## Source file: `32_CURRENT_OFFICIAL_IMPLEMENTATION_NOTES.md`

---
title: Current Official Implementation Notes
order: 32
phase: reference
status: ready
review_date: 2026-07-04
---

# Current Official Implementation Notes

This file records time-sensitive implementation notes that agents must verify against official documentation before upgrades.

## Next.js 15

- Use App Router Route Handlers under the `app` directory.
- GET Route Handlers are not cached by default in Next.js 15.
- `params`, `searchParams`, `cookies()`, and `headers()` use asynchronous patterns in Next.js 15.
- Keep Mongoose and other Node-specific dependencies on the Node.js runtime.

Official references:

- https://nextjs.org/docs/app/getting-started/route-handlers
- https://nextjs.org/docs/app/guides/upgrading/version-15
- https://nextjs.org/docs/messages/sync-dynamic-apis

## Auth.js

- Use the official Next.js integration and Credentials provider documentation.
- Auth.js supports JWT and database session strategies; this project uses JWT sessions with server-side user and permission freshness checks.

Official references:

- https://authjs.dev/reference/nextjs
- https://authjs.dev/getting-started/authentication/credentials
- https://authjs.dev/concepts/session-strategies

## MongoDB Atlas

- The product UI and documentation may refer to the old M0 tier as a Free cluster.
- Free clusters are intended for small-scale development or initial workloads and have feature limitations.
- Verify backup, connection, storage, and operational limits before production launch.

Official references:

- https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/

## Pusher Channels

- Use private channels for station, table, cashier, admin, and user-specific data.
- Channel subscription must be authorized by a server endpoint.

Official references:

- https://pusher.com/docs/channels/using_channels/private-channels/
- https://pusher.com/docs/channels/server_api/authorizing-users/
- https://pusher.com/docs/channels/getting_started/javascript/

## Review rule

Before changing framework or provider versions:

1. Review official migration notes.
2. Run all unit, integration, E2E, and load smoke tests.
3. Record an ADR.
4. Update this file's review date.

---

## Source file: `33_RISK_REGISTER_AND_GLOSSARY.md`

---
title: Risk Register and Glossary
order: 33
phase: reference
status: ready
---

# Risk Register and Glossary

## Operational and technical risks

| Risk | Impact | Required mitigation |
|---|---|---|
| Hosting cold start or temporary platform delay | Waiter waits before opening or firing an order | Keep operational payloads small, measure cold starts, use an always-available real-time provider, show clear retry state, and select a hosting plan appropriate for live service before production |
| Real-time provider outage or message limit | Live updates are delayed | Database remains authoritative, show connection status, re-fetch by REST, provide temporary polling mode, and monitor provider usage |
| Database free-tier limit reached | Writes or connections fail | Monitor storage and connections, archive old operational data safely, optimize indexes, and document the upgrade path |
| Lost or delayed real-time event | Station or waiter misses a status change | Auto-reconnect, entity versioning, and REST reconciliation on reconnect and tab resume |
| Permission misconfiguration | Staff gain wrong access or lose needed access | Permission-based server guards, grouped role editor, audit role edits, automated RBAC tests, and emergency Super Admin access procedure |
| Menu price changes during service | Incorrect bill | Store name, price, modifier, and station snapshots on each fired order line |
| Duplicate order submission | Duplicate food or drinks | Client mutation ID plus server idempotency record |
| Duplicate payment | Financial error | Payment idempotency key, atomic state guard, and post-timeout status lookup |
| Two waiters open one table | Duplicate tickets | Partial unique index for OPEN table tickets and atomic open-ticket service |
| Station status updated twice | Skipped or inconsistent state | Legal transition map, optimistic concurrency/version, disabled duplicate taps, and server validation |
| Weak Wi-Fi | Slow or missing operational updates | PWA shell cache, local unsent draft, compact payloads, connection banner, and controlled reconnect workflow |
| Backup exists but cannot restore | Permanent data loss | Scheduled encrypted export and regular restore test |
| Large report slows live service | Operational latency | Date bounds, indexes, aggregation projections, brief caching, and off-peak exports |

## Glossary

| Term | Meaning |
|---|---|
| Ticket | The whole order and bill in progress for a table |
| Order line | One ordered item tracked independently through preparation and service |
| Fire | Submit order lines to their assigned preparation stations |
| Station | A preparation area such as Kitchen or Bar |
| KDS | Kitchen Display System |
| BDS | Bar Display System |
| RBAC | Role-Based Access Control implemented through permissions |
| Permission | One server-enforced ability such as `order:create` |
| PWA | Progressive Web App that can be installed and can cache a safe application shell |
| Snapshot | Frozen historical copy of name, price, modifier, or station data at order time |
| Idempotency key | A unique request key that makes retries return the original result rather than repeat the operation |
| Minor unit | Integer representation of currency used to avoid floating-point errors |
| Reconciliation | Re-fetching authoritative server state after events, reconnects, or optimistic updates |
| Outbox | Stored pending event publication that can be retried after the main database write |
| ADR | Architecture Decision Record explaining a significant technical decision |

---

## Source file: `34_PHASED_ROADMAP_AND_TASK_SEQUENCE.md`

---
title: Phased Roadmap and Task Sequence
order: 34
phase: planning
status: ready
---

# Phased Roadmap and Task Sequence

The sequence is dependency-driven. Estimates are planning aids for one focused developer and must be adjusted after repository and team review.

## Phase 0 - Foundations

Target: Week 1

1. Guides 01-05.
2. Repository, quality tools, environment validation, and documentation.
3. Database connection and base models from Guide 06.
4. Authentication and RBAC foundations from Guides 07-08.
5. Seed the Super Admin and permission catalog.

**Gate:** login, permission guard, database indexes, and clean CI build.

## Phase 1 - Admin Core

Target: Week 2

1. Guide 09.
2. Stations, categories, menu items, modifiers, zones, and tables.
3. Users, multiple roles, role permission editor, and restaurant settings.
4. Demo seed script.

**Gate:** a restaurant can be configured without direct database editing.

## Phase 2 - Live Ordering Loop

Target: Weeks 3-4

1. Guides 10-15.
2. Floor view and atomic table opening.
3. Order composer and idempotent fire operation.
4. Real-time private channels.
5. KDS and BDS.
6. READY alerts, serving, and additional rounds.

**Gate:** the full waiter-to-station-to-waiter loop passes mixed Kitchen/Bar testing.

## Phase 3 - Cashier and Receipt

Target: Week 5

1. Guides 16-18.
2. Ticket close and live cashier queue.
3. Discounts, tax, service charge, payment, and table release.
4. Browser print and PDF receipt.

**Gate:** a complete table journey reaches PAID exactly once with matching receipt totals.

## Phase 4 - Operations and Release Quality

Target: Week 6

1. Guides 19-27.
2. Reports and audit.
3. UI/UX consistency and accessibility.
4. Performance measurement and optimization.
5. PWA resilience.
6. Security, test automation, observability, backups, CI/CD, and handover.

**Gate:** all release acceptance scenarios pass on real target devices.

## Phase 5 - Later enhancements

Start only after production stability and usage measurement. Follow Guide 28 and create a separate approved plan for each enhancement.

## Execution rule

Never run UI, API, data, and real-time work as disconnected parallel streams without shared contracts. Complete and test each vertical slice so a usable system exists early.
