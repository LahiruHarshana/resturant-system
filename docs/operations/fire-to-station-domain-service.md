# Fire-to-Station Domain Service

## Overview

The **Fire-to-Station Domain Service** acts as the central router for orders submitted by waiters. It is implemented in `fireTicketLines` within `src/server/waiter/order-service.ts`. The service handles firing existing `NEW` order lines, idempotency, validation, audit logging, and station grouping.

## Responsibilities

1. **Idempotency**: 
   - A client-provided UUID `idempotencyKey` ensures duplicate rapid submissions (e.g., from network retries or double clicks) do not duplicate station work.
   - Idempotency records are tied strictly to the combination of `idempotencyKey` and `ticket:${ticketId}:fire`.
   - If a duplicate submission is detected, the service gracefully returns the idempotency status.

2. **Validation & State Enforcement**:
   - The UI supplies `lineIds` to fire. The backend validates that these lines exist and belong to the correct ticket.
   - Authoritative data (e.g. `stationId`, `stationType`, `status`, `firedAt`) is strictly controlled by the backend and cannot be overridden by malicious client payloads.
   - The ticket must be `OPEN`. The lines must not be `VOID`.

3. **Snapshots and Routing**:
   - Order lines are created with an initial status of `NEW` via the separate Guide 11 `addOrderLines` route.
   - When `fireTicketLines` runs, it updates the lines' `firedAt` timestamp deterministically.
   - The backend groups the fired lines by their respective authoritative `Station` records, ensuring lines for a "Bar" item go to the correct active Bar station and "Kitchen" items go to the Kitchen.

4. **Grouped Payloads**:
   - The response conforms to `FireTicketLinesResponseSchema`, returning an array of `stations` populated with the grouped `OrderLine` items.
   - This grouped format (`StationFiredPayload`) provides the precise contract necessary to update KDS or BDS (Kitchen/Bar Display Systems) interfaces directly from the API without requiring a full page refresh.

## Transactions

The entire operation uses MongoDB `withTransaction`:
- Validates the ticket status is `OPEN`.
- Updates all requested lines atomically, avoiding partial mutation if any line is invalid.
- Generates a central `FIRE_ORDER` audit log.
- Saves the idempotency record.

## API Integration

**Endpoint**: `POST /api/waiter/tickets/:id/fire`
(Note: Line creation is handled by `POST /api/waiter/tickets/:id/lines`)

**Usage Context**: 
This endpoint is consumed heavily by the waiter UI (e.g., via the Fire to Kitchen button in `ComposerCartDrawer`). Upon success, the UI summarizes the routing logic directly from the grouped payload or shows conflict validation errors to the staff.
