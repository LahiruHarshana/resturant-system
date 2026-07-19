---
title: Waiter Live Ticket, READY Alerts, and Serving
order: 15
phase: ordering-loop
status: not-started
---

# Waiter Live Ticket, READY Alerts, and Serving

## Objective

Give the waiter a live, accurate ticket view and a clear pickup workflow.

## Live ticket sections

- Ticket summary and running authoritative total.
- Lines grouped by fired round or time.
- Status badge on every line.
- READY pickup area pinned near the top.
- Actions: Add More, Mark Served, Close Ticket.

## READY alert behavior

When a line becomes READY:

1. Apply the event only when its version is newer.
2. Add the line to the pickup area.
3. Show a persistent banner with table and item names.
4. Play a short sound and optional haptic-style animation when enabled.
5. Keep the alert visible until acknowledged or served.
6. Re-fetch the ticket in the background.

Avoid transient toasts as the only READY notification.

## Mark served

The waiter can mark individual READY lines as SERVED. The server must validate:

- Ticket access.
- Current status is READY.
- The requested transition is legal.
- Actor has the required permission.

## Add more

The Add More action returns to the order composer with the same OPEN ticket. New lines create a new fired round and route normally.

## Close ticket guard

Before closing, show:

- Any NEW or PREPARING lines.
- Any READY lines not served.
- Current total.

Policy may allow closing with unfinished lines only after explicit confirmation and elevated permission. The safe default is to block and explain why.

## Performance

- Subscribe only to the current table and user channels.
- Patch local line status from events, then reconcile.
- Avoid re-downloading menu data for every ticket status update.
- Keep the live view mounted while a bottom sheet opens.

## Tests

- READY alert only reaches the relevant table or waiter.
- Alert persists until handled.
- Stale event ignored.
- Served transition is legal only from READY.
- Add More creates a new round on the same ticket.

## Exit gate

The waiter can immediately identify exactly which items are ready, where they belong, and whether the table can be closed.
