---
title: Risk Register and Glossary
order: 33
phase: reference
status: ready
---

# Risk Register and Glossary

## Operational and technical risks

| Risk | Impact | Required mitigation |
|---|---|---|
| Hosting cold start or temporary platform delay | Waiter waits before opening or firing an order | Keep operational payloads small, measure cold starts, use an always-available real-time provider, show clear retry state, and select a hosting plan appropriate for live service before production |
| Real-time provider outage or message limit | Live updates are delayed | Database remains authoritative, show connection status, re-fetch by REST, provide temporary polling mode, and monitor provider usage |
| Database free-tier limit reached | Writes or connections fail | Monitor storage and connections, archive old operational data safely, optimize indexes, and document the upgrade path |
| Lost or delayed real-time event | Station or waiter misses a status change | Auto-reconnect, entity versioning, and REST reconciliation on reconnect and tab resume |
| Permission misconfiguration | Staff gain wrong access or lose needed access | Permission-based server guards, grouped role editor, audit role edits, automated RBAC tests, and emergency Super Admin access procedure |
| Menu price changes during service | Incorrect bill | Store name, price, modifier, and station snapshots on each fired order line |
| Duplicate order submission | Duplicate food or drinks | Client mutation ID plus server idempotency record |
| Duplicate payment | Financial error | Payment idempotency key, atomic state guard, and post-timeout status lookup |
| Two waiters open one table | Duplicate tickets | Partial unique index for OPEN table tickets and atomic open-ticket service |
| Station status updated twice | Skipped or inconsistent state | Legal transition map, optimistic concurrency/version, disabled duplicate taps, and server validation |
| Weak Wi-Fi | Slow or missing operational updates | PWA shell cache, local unsent draft, compact payloads, connection banner, and controlled reconnect workflow |
| Backup exists but cannot restore | Permanent data loss | Scheduled encrypted export and regular restore test |
| Large report slows live service | Operational latency | Date bounds, indexes, aggregation projections, brief caching, and off-peak exports |

## Glossary

| Term | Meaning |
|---|---|
| Ticket | The whole order and bill in progress for a table |
| Order line | One ordered item tracked independently through preparation and service |
| Fire | Submit order lines to their assigned preparation stations |
| Station | A preparation area such as Kitchen or Bar |
| KDS | Kitchen Display System |
| BDS | Bar Display System |
| RBAC | Role-Based Access Control implemented through permissions |
| Permission | One server-enforced ability such as `order:create` |
| PWA | Progressive Web App that can be installed and can cache a safe application shell |
| Snapshot | Frozen historical copy of name, price, modifier, or station data at order time |
| Idempotency key | A unique request key that makes retries return the original result rather than repeat the operation |
| Minor unit | Integer representation of currency used to avoid floating-point errors |
| Reconciliation | Re-fetching authoritative server state after events, reconnects, or optimistic updates |
| Outbox | Stored pending event publication that can be retried after the main database write |
| ADR | Architecture Decision Record explaining a significant technical decision |
