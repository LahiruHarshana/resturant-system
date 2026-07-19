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
