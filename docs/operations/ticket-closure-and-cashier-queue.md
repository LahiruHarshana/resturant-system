# Ticket Closure and Cashier Queue

## Domain Workflow
The ticket closure process transitions an order from active processing (OPEN) to pending payment (CLOSED). Once all physical items have been served, the waiter can close the ticket. The ticket then appears in the cashier queue for final settlement.

### State Transitions
- **OPEN -> CLOSED**: The valid state transition triggered by the Waiter via `PATCH /api/waiter/tickets/[id]/close`.
- **CLOSED -> PAID**: Will be handled in the future when the Cashier collects payment.
- **CLOSED -> CANCELLED**: Not applicable for closure; a ticket can only be closed if it is OPEN.

## Invariants
1. **Empty Ticket Block**: An empty ticket (no order lines) cannot be closed.
2. **Unserved Items Block**: A ticket cannot be closed if any of its order lines are in `NEW`, `PREPARING`, or `READY` states. All lines must be either `SERVED` or `VOID`.
3. **Idempotency**: The close operation is strictly idempotent to prevent duplicate processing on unstable connections.
4. **Total Consistency**: The backend independently recalculates the subtotal, tax, and service charge from snapshots before closing, ignoring any totals sent by the client.
5. **Table Availability**: The table status is reset to `AVAILABLE`, the `currentTicketId` is cleared, and `openedAt` is nullified once the ticket is closed.
6. **Audit Traces**: Every closure generates an `AuditLog` entry detailing the actor and final totals.

## Cashier Queue
The Cashier Queue allows cashiers and managers to monitor tickets that are ready for payment.

- **Data Retrieval**: `GET /api/cashier/queue` returns a compact DTO listing all tickets with `status === "CLOSED"`.
- **Filtering**: `OPEN`, `PAID`, and `CANCELLED` tickets are excluded.
- **Sorting**: The oldest closed tickets are prioritized (sorted by `closedAt` ascending).

## Realtime Integration
When a ticket is successfully closed, a `ticket.closed.v1` event is published to the cashier channel (`private-cashier`). This allows the cashier queue UI to update instantly without polling. If the transaction fails, no event is published.
