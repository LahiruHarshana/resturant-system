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
