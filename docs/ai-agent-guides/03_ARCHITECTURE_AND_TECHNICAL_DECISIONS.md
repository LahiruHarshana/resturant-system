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
