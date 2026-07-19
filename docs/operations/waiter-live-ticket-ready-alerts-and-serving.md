# Waiter Live Ticket, READY Alerts, and Serving

This document describes the waiter-facing serving workflow introduced in Guide 15.

## Overview

After kitchen/bar staff mark order lines as READY (via Guide 14 KDS/BDS), the waiter must be alerted and able to confirm delivery to the guest (SERVED transition). This guide implements:

1. A `GET /api/waiter/tickets/:id/ready-lines` endpoint returning all READY lines for a ticket.
2. A `PATCH /api/waiter/tickets/:id/lines/:lineId/served` endpoint that transitions a line from READY → SERVED.
3. A `markLineServed` domain service method (idempotent, transaction-safe with MongoDB sessions).
4. A realtime table-channel subscription in `TicketClient` that pops a toast and vibrates the device when a READY event fires.
5. A **Ready for Pickup** UI panel in the waiter ticket view that lists READY lines with individual **Mark Served** buttons.

---

## Permissions

| Action | Required Permission |
|---|---|
| Read ready lines | `table:read` |
| Mark line served | `order:update` |

Both use `requirePermission` from `@/server/auth/authorization`. Role names are never used directly.

---

## API Routes

### GET `/api/waiter/tickets/[id]/ready-lines`

- File: `src/app/api/waiter/tickets/[id]/ready-lines/route.ts`
- Auth: `requirePermission("table:read")`
- Returns `{ lines: ReadyLine[] }` where each entry has `id`, `itemNameSnapshot`, `quantity`, `note`, `status`.
- Only returns lines with `status === "READY"` for the given ticket.

### PATCH `/api/waiter/tickets/[id]/lines/[lineId]/served`

- File: `src/app/api/waiter/tickets/[id]/lines/[lineId]/served/route.ts`
- Auth: `requirePermission("order:update")`
- Body: `{ idempotencyKey: string }`
- Calls `markLineServed` service.
- Returns `{ success: true }` on success.

---

## Domain Service: `markLineServed`

- File: `src/server/waiter/order-service.ts`
- Uses a Mongoose transaction session.
- Guards:
  - Ticket must exist and be `OPEN`.
  - Line must belong to that ticket.
  - Line must be `READY` (rejects any other status with a typed error).
  - Already-SERVED is idempotent (returns success without double-writing).
- On success:
  - Sets `line.status = "SERVED"` and `line.servedAt = new Date()`.
  - Creates an `AuditLog` entry with `action: "LINE_STATUS_UPDATED"`.
  - Creates or updates an `IdempotencyRecord` for the key.
  - Publishes a `line.status-changed.v1` event to the table's private channel via `publishToTable` (Guide 13 provider abstraction).

---

## Realtime Integration

The `TicketClient` subscribes to `private-table-{tableId}` via `useRealtimeChannel` with the `line.status-changed.v1` event schema. On receipt of a READY event:

1. Shows a `sonner` toast: *"An order item is ready for pickup!"* with a pulse bell icon.
2. Triggers `navigator.vibrate([200, 100, 200])` if supported (mobile PWA UX).
3. Invalidates the `["ready-lines", ticketId]` React Query cache so the pickup panel updates immediately.

---

## UI: Ready for Pickup Panel

- When `readyLines.length > 0`, a slide-in panel is shown at the top of the ticket view.
- Each READY line is listed with its quantity, name, optional note, and a **Mark Served** button.
- The button fires `markServedMutation.mutate(line.id)` which calls the PATCH route.
- On success, `queryClient.invalidateQueries` refreshes the panel.
- On error, a toast displays *"Failed to mark served"*.

---

## Tests

| File | Tests | What is proven |
|---|---|---|
| `tests/unit/mark-served.test.ts` | 11 | READY → SERVED success; non-READY rejected; closed ticket rejected; idempotency; concurrent safe; failed event block |
| `tests/integration/waiter-serving-api.test.ts` | 5 | Full flow: fetch ready lines, unauth, no perm, missing ticket/line handling, mark served |
| `tests/components/waiter-serving-ui.test.tsx` | 2 | UI renders READY lines, Mark Served fires correct fetch, panel disappears, double-click prevention, realtime subscribe |

---

## Invariants Not Broken

- Middleware is not the only security boundary; `requirePermission` is enforced in every route handler.
- No Pusher calls outside the Guide 13 provider utilities (`publishToTable`).
- No raw Mongoose documents returned over API — all data mapped to plain DTOs.
- No role names used for authorization.
