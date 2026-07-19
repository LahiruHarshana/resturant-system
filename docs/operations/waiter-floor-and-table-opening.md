# Waiter Floor and Table Opening

## Overview

The Waiter Floor module provides an active real-time view of restaurant zones and tables. It enables authorized staff (Waiters, Admins, Managers) to open tickets for tables, creating a concurrency-safe authoritative source of truth for table occupancy.

## Core Features

1. **Floor List APIs** (`/api/waiter/tables`): Fetches only ACTIVE zones and non-INACTIVE tables to populate the interactive map. The queries utilize `lean()` Mongoose reads with strict projections to minimize memory allocation and latency.
2. **Transactional Table Opening**: Uses MongoDB's `session.withTransaction()` alongside an atomic Counter sequence generator.
3. **Concurrency-Safe Idempotency**: Due to potential race conditions on mobile/tablet networks (e.g., a waiter double-taps "Open Table", or two waiters tap at the exact same moment), we rely on a partial unique MongoDB index (`tableId: 1` where `status="OPEN"`). If duplicate creation is attempted, an `E11000` duplicate key exception is safely caught and converted into a success payload that returns the *existing* authoritative ticket (with `created: false`).
4. **Authoritative Input Handling**: Client provided values for security-sensitive attributes like `waiterId`, `ticketNo`, `status`, `subtotalMinor`, etc., are strictly ignored by the API route and server logic. Only `tableId` and `guestCount` are accepted by the Zod validator.

## Flow & Integration

1. Waiter views `/waiter/floor`
2. Waiter taps an "AVAILABLE" table.
3. An `OpenTicketSheet` appears, requesting a Guest Count.
4. On submit, a POST request goes to `/api/waiter/tickets`.
5. The `TicketService` uses a replica-set transaction to create the ticket, increment the `ticketNo` counter, update the `RestaurantTable` status to `OCCUPIED`, and emit an Audit log entry.
6. If the ticket is opened successfully (or safely resumed), the waiter is navigated to the ticket POS view `/waiter/tickets/[id]`.

## Boundaries & Dependencies
- Server-authoritative logic completely enforces RBAC bounds (i.e. `table:read` and `order:create` permissions).
- UI Components are purely presentational and never import direct database connection libraries or server-only utilities.
