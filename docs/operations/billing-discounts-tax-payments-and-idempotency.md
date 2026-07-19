# Billing, Discounts, Tax, Payments, and Idempotency

## Overview
The billing process transitions an order from `CLOSED` to `PAID` via the Cashier. The system handles secure bill calculation, discount validation, precise rounding via integer minor units, and strict idempotency for payments.

## Billing Calculation
1. **Source of Truth**: The bill is calculated independently by the server using `OrderLine` snapshots (`priceSnapshotMinor`, `quantity`). The server ignores any client-supplied totals.
2. **Subtotal**: The sum of all `SERVED` order lines.
3. **Discount**: A fixed monetary discount can be applied. If the discount exceeds the subtotal, it is capped at the subtotal.
4. **Tax & Service Charge**: Configured in `RestaurantSettings` (e.g., `taxBps` for Tax Basis Points, `serviceChargeBps` for Service Charge Basis Points). These are applied to the `taxableTotal` (subtotal minus discount).
5. **Rounding**: All money math uses integer minor units (e.g. cents). Percentages via basis points use standard arithmetic rounding.

## Payments
1. **Methods**: `CASH`, `CARD`, `OTHER`.
2. **Validation**: The exact total must be tendered for non-cash. Cash can be over-tendered, and `changeMinor` will be recorded.
3. **Idempotency**: Every payment request requires an `idempotencyKey` UUID. If the same key is submitted twice (e.g. due to double-clicks or network retries), the server honors the original successful transaction and returns an identical `200 OK` result without duplicating payments or events.
4. **State Transition**: Successfully paid tickets transition to `PAID` and receive a `paidAt` timestamp.
5. **Table Freeing**: Upon successful payment, the `RestaurantTable` is marked `AVAILABLE`, its `currentTicketId` is cleared, and `openedAt` is nullified, making it ready for new guests.
6. **Cashier Queue**: The UI cashier queue inherently filters out non-`CLOSED` tickets. When a ticket becomes `PAID`, it immediately vanishes from the queue.

## Realtime
- Upon successful transaction commit, `ticket.paid.v1` is published to the `private-cashier` channel.
- `table.status.updated` is published to `private-tables`.
- Failed attempts or idempotent retries do not broadcast duplicate events.

## Audit Logging
- **Discounts**: Applying or altering a discount generates an `AuditLog` mapping the actor, ticket, and amount.
- **Payments**: The final `Payment` creation, method, total amount, and actor are strictly audited.

## Deferred to Guide 18
- Receipt printing, PDF generation, and email workflows.
- Granular refunds.
