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
