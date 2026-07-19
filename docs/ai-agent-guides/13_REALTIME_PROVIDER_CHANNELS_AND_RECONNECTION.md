---
title: Real-Time Provider, Channels, and Reconnection
order: 13
phase: realtime
status: not-started
---

# Real-Time Provider, Channels, and Reconnection

## Objective

Deliver secure, reliable live updates without coupling domain code to one vendor.

## Provider interface

```ts
interface RealTimeProvider {
  publish(channel: string, event: string, payload: unknown): Promise<void>;
}
```

Create:

- `PusherRealTimeProvider` for the recommended serverless deployment.
- A test provider that records events.
- An interface compatible with a future Socket.IO adapter.

## Channel strategy

Use private channels:

```text
private-station-<stationId>
private-table-<tableId>
private-cashier
private-admin
private-user-<userId>
```

## Authorization endpoint

Create a channel authorization route. It must:

1. Authenticate the session.
2. Parse the requested channel.
3. Verify the user has permission for that channel.
4. For station channels, validate station type and scoped read permission.
5. Reject arbitrary channel names.

## Event contract

Use versioned names:

```text
line.created.v1
line.status-changed.v1
ticket.updated.v1
ticket.closed.v1
ticket.paid.v1
permissions.changed.v1
```

Payloads should include:

- Entity ID.
- New status or changed field.
- Entity version.
- Server timestamp.
- Correlation ID when useful.

## Client reliability

- Show connection status.
- Reconnect automatically.
- On reconnect or tab resume, re-fetch the authoritative queue or ticket.
- Deduplicate events by event ID or entity version.
- Ignore stale versions.
- Do not assume every event arrives.

## Publish-after-write rule

Never let a real-time event be the source of truth. Write to MongoDB first, then publish. For stronger reliability, implement an outbox collection processed after the response or by a scheduled worker.

## Performance rules

- Batch station notifications when one fire request creates several lines.
- Avoid large payloads and images.
- Do not broadcast to global channels when a station or table channel is sufficient.
- Use one shared client connection per browser tab.

## Tests

- Unauthorized channel subscription denied.
- Kitchen user cannot subscribe to Bar station.
- Reconnect triggers REST reconciliation.
- Stale event does not overwrite newer state.
- Publish failure does not roll back an already successful order without an explicit strategy.

## Exit gate

Station, waiter, cashier, and admin clients receive only authorized events and recover correctly after a temporary connection loss.
