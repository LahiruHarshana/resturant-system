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
