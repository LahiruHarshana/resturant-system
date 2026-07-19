# ADR 0003: Real-Time Provider Abstraction With Pusher First

## Status

Accepted

## Context

The system requires reliable live updates for Kitchen, Bar, waiter READY alerts, cashier queue changes, admin notifications, and permission refreshes. The original specification discusses Socket.IO and also notes that Vercel serverless functions do not hold reliable long-lived WebSocket connections. The approved deployment target is Vercel, and the approved initial real-time provider is Pusher Channels.

## Decision

Use Pusher Channels as the initial real-time provider for Vercel deployment. Keep all server-side real-time publishing behind a `RealTimeProvider` application interface. Domain services publish events through that interface only and must not call the Pusher SDK directly. Socket.IO self-hosting remains a documented future alternative if deployment moves to an always-on Node.js server.

Real-time events are notifications only. MongoDB remains authoritative. Clients must re-fetch authoritative state after reconnect, tab resume, or stale event detection.

## Alternatives Considered

| Alternative | Reason not selected |
|---|---|
| Native Socket.IO on Vercel serverless functions | Vercel serverless functions are not reliable for long-lived WebSocket servers. |
| Self-hosted Socket.IO on Render or Railway first | Adds operational sleep/cold-start concerns and deviates from the primary Vercel target. |
| Direct Pusher SDK calls inside domain services | Couples business logic to a vendor and blocks future replacement. |
| Polling only | Simpler but weakens real-time station and READY alert experience. May be a fallback, not the primary approach. |
| Ably first | Viable, but Pusher is the selected initial provider for simplicity and free-tier suitability. |

## Consequences

Positive:

- Vercel deployment remains simple.
- Pusher provides private channels without running a custom socket server.
- Provider abstraction enables future Socket.IO, Ably, or polling replacement.
- Domain services remain vendor-independent.

Negative:

- Free-tier message and connection limits must be monitored.
- Private channel authorization routes must be implemented securely.
- Publish failures after database writes require a retry or outbox strategy in later guides if stronger delivery is needed.

## Security Impact

- Channels must be private and authorized by the server.
- Station subscriptions must verify station type and `line:read:kitchen` or `line:read:bar` permissions.
- User channels must match the authenticated user ID.
- Events must not contain secrets, credentials, full payment details, or unnecessary personal data.

## Performance Impact

- Events must be compact and versioned, usually containing IDs, status, timestamps, versions, and correlation IDs rather than hydrated documents.
- Batch station notifications when one order creates multiple lines.
- Avoid global broadcasts when station, table, cashier, admin, or user channels are sufficient.
- Clients should patch small state changes then reconcile without refetch storms.

## Operational Impact

- Pusher credentials must be environment variables and never committed.
- Provider usage and limits must be monitored.
- A temporary polling fallback should be documented in operations guides.
- Future migration to Socket.IO should require only adapter and deployment changes, not domain service rewrites.

## Conditions To Revisit

Revisit this decision if:

- Pusher free-tier limits are exceeded or costs become unsuitable.
- The deployment target changes from Vercel to an always-on Node.js host.
- Operational requirements demand full control over socket infrastructure.
- Message durability requirements justify implementing an outbox plus worker or different provider.
