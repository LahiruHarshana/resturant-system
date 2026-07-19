---
title: Fire-to-Station Domain Service
order: 12
phase: ordering-loop
status: not-started
---

# Fire-to-Station Domain Service

## Objective

Implement the central business operation that validates a submitted draft, creates snapshots, updates totals, and routes each line to the correct station.

## Service signature

```ts
fireOrderLines({
  actorId,
  ticketId,
  clientMutationId,
  items
}): Promise<FireOrderLinesResult>
```

## Required processing order

1. Authenticate and require `order:update`.
2. Resolve or create an idempotency record.
3. Load the ticket with a minimal projection.
4. Require ticket status OPEN.
5. Load all referenced menu items in one query.
6. Validate item availability and modifier selections.
7. Resolve the station from each stored menu item.
8. Calculate line totals in integer minor units.
9. Build immutable snapshots.
10. Insert all order lines in a batch.
11. Recompute or increment ticket totals atomically.
12. Store the idempotent response.
13. Publish station events after the database commit.
14. Return created lines grouped by station and authoritative totals.

## Avoid N+1 queries

Do not call `MenuItem.findById()` inside an item loop. Fetch all menu items with one `$in` query and map them by ID.

## Suggested order-line snapshot

```ts
{
  ticketId,
  menuItemId,
  nameSnapshot,
  priceSnapshotMinor,
  qty,
  modifiersSnapshot,
  note,
  stationId,
  stationTypeSnapshot,
  status: 'NEW',
  firedAt,
  lineTotalMinor,
  version: 1
}
```

## Event publication

Publish one compact event per affected station or one batched station event:

```ts
{
  ticketId,
  stationId,
  lineIds,
  tableLabel,
  firedAt,
  version
}
```

Station clients must then reconcile with a station queue fetch. This is more reliable and smaller than broadcasting fully populated documents.

## Failure behavior

- No partial successful response without a documented compensation path.
- If publishing fails after the write, store an outbox item or retry asynchronously.
- A repeated idempotency key returns the original result.

## Tests

- Kitchen and Bar items split correctly.
- Multiple items load in one menu query.
- Closed ticket rejected.
- Stale unavailable item rejected.
- Repeated submission creates no duplicates.
- Menu price change after firing does not change the line.

## Exit gate

A mixed order produces correct NEW lines at both stations, correct totals, and no duplicate lines under retry.
