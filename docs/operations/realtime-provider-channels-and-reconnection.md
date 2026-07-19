# Real-Time Provider, Channels, and Reconnection

This document outlines the architecture for real-time synchronization in the restaurant system.

## Provider Abstraction
To avoid tight coupling to any specific WebSocket vendor, the system relies on a `RealTimeProvider` interface (`src/server/realtime/provider.ts`). 
- **PusherRealTimeProvider**: Used in production and development when valid credentials exist.
- **TestRealTimeProvider**: Used implicitly in testing to intercept events and prevent cross-environment contamination.

## Channel Security
All event channels prefix with `private-` and require explicit client authentication via `/api/realtime/auth`. 
- **Station/Table**: Uses `table:read` permissions as a broad fallback until granular rules are introduced.
- **Admin**: Uses `report:view` permissions.

## Event Payloads and Type Safety
Event payloads are serialized and parsed with `zod` schemas in `src/shared/realtime/events.ts`. 
Real-time clients are untrusted. Sending raw MongoDB documents is strictly prohibited. Payloads must conform to `.v1` versioned shapes.

## Outbox / Post-Commit Publishing
Realtime events must only fire *after* the `mongoose.withTransaction` wrapper commits. 
This guarantees that clients won't receive `line.created` notifications before the corresponding rows exist in the authoritative database.
