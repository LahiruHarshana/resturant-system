# Business Invariants

## Purpose

This document defines non-negotiable business invariants for the Restaurant Order Management System. Implementations must preserve these invariants in database models, services, API routes, UI flows, real-time handlers, tests, and operational documentation.

## Enforcement Principles

| ID | Principle |
|---|---|
| EP-001 | The server and database are authoritative. Client state is never authoritative for business-critical decisions. |
| EP-002 | All protected actions require permission checks, not hard-coded role checks. |
| EP-003 | Real-time events notify clients that something changed; they do not replace validation or persistence. |
| EP-004 | Financial and status mutations must be idempotent or protected against duplicate execution where required. |
| EP-005 | Business-critical data must be auditable where policy requires accountability. |

## Actor And Permission Matrix

| Capability | Required permission | Notes |
|---|---|---|
| View tables | `table:read` | Required before opening or resuming tickets. |
| Open ticket | `order:create` | Must also satisfy the one-OPEN-ticket-per-table invariant. |
| Add order lines | `order:update` | Ticket must be OPEN. |
| Close ticket | `order:close` | Ticket must be OPEN and close policy must pass. |
| Read Kitchen lines | `line:read:kitchen` | Does not grant Bar access. |
| Read Bar lines | `line:read:bar` | Does not grant Kitchen access. |
| Update Kitchen line status | `line:status:kitchen` | Applies only when stored line station type is Kitchen. |
| Update Bar line status | `line:status:bar` | Applies only when stored line station type is Bar. |
| Void line | `line:void` | Requires reason and audit record. |
| Cancel ticket | `ticket:cancel` | Requires reason and audit record. |
| Create payment | `payment:create` | Ticket must be CLOSED and payment must be idempotent. |
| Print receipt | `receipt:print` | Receipt must use ticket, line, and payment snapshots. |
| View reports | `report:view` | Report queries must be bounded and performant. |
| View audit logs | `audit:view` | Sensitive metadata must be redacted. |

## Core Invariants

| ID | Invariant | Enforcement requirement | Example violation |
|---|---|---|---|
| INV-001 | Only one active OPEN ticket may exist for a table. | Use atomic open-ticket logic and a database-level uniqueness guard. | Two waiters create two OPEN tickets for Table T1. |
| INV-002 | New order lines may be added only to an OPEN ticket. | Server checks ticket status immediately before creating lines. | Adding dessert to a CLOSED ticket. |
| INV-003 | A ticket cannot become PAID before it is CLOSED. | Payment service accepts only CLOSED tickets. | Cashier pays an OPEN ticket. |
| INV-004 | A PAID ticket is immutable except for controlled audit or refund workflows added later. | Normal update, cancel, reopen, and add-line operations reject PAID tickets. | Manager edits paid line prices after payment. |
| INV-005 | CANCELLED tickets cannot be paid or reopened through normal operations. | Payment and open/resume services reject CANCELLED tickets. | Cashier pays a cancelled ticket. |
| INV-006 | Every fired order line must have a resolved station. | Server resolves station from the stored menu item at fire time. | Line is created without `stationId`. |
| INV-007 | Item name and price must be snapshotted when the line is created. | Order-line creation copies item name and price into immutable snapshot fields. | Receipt reads current menu price instead of fired price. |
| INV-008 | Menu price changes must never alter existing order-line totals. | Totals and receipts use order-line snapshots. | A price increase changes yesterday's receipt. |
| INV-009 | Quantity must be a positive valid integer. | Validate on client for usability and server for authority. | Quantity is zero, negative, fractional, or not numeric. |
| INV-010 | Monetary calculations must use integer minor units. | Store and calculate money as integers such as cents or cents-equivalent minor units. | Floating-point total produces rounding error. |
| INV-011 | Ticket totals must be derived from valid non-VOID lines and approved adjustments. | Server recalculates or atomically maintains totals from line snapshots and approved discounts, service charges, and taxes. | Client submits arbitrary total. |
| INV-012 | A Bar user cannot update Kitchen lines. | Required permission is derived from the stored line station type. | Bar user marks a Kitchen line READY. |
| INV-013 | A Kitchen user cannot update Bar lines. | Required permission is derived from the stored line station type. | Kitchen user starts a Bar drink line. |
| INV-014 | Every protected action must use permission checks, not hard-coded role names. | Code must call permission guards such as `requirePermission`. | `if user.role === "waiter"` controls server access. |
| INV-015 | A user may hold multiple roles and receives the union of their permissions. | Effective permissions are calculated from all active assigned roles. | Waiter plus Bar user is forced to choose one role. |
| INV-016 | A payment request must be idempotent. | Payment service requires an idempotency key scoped to the operation. | Browser retry creates a second payment. |
| INV-017 | Duplicate payment requests must not create multiple payments. | Repeated idempotency key returns the original result or current authoritative status. | Double-click creates two payment records. |
| INV-018 | Successful payment must atomically create payment, mark ticket PAID, store paid timestamp, and release table. | Use transaction when available and logical guards as backup. | Ticket is PAID but table remains occupied. |
| INV-019 | Voiding a line must require a reason and audit record. | Void service validates reason and writes audit evidence. | User voids a line with no explanation. |
| INV-020 | Cancelling a ticket must require proper permission, reason, and audit record. | Cancel service validates `ticket:cancel`, reason, and policy. | Ticket disappears without accountability. |
| INV-021 | Status changes must be validated server-side. | Server enforces transition maps and current state checks. | Client sends `SERVED` for a NEW line and server accepts it. |
| INV-022 | Real-time events must never replace database validation. | Event handlers trigger re-fetch or patch only after version checks. | Client marks a line READY only because a socket message arrived. |
| INV-023 | Reconnected clients must re-fetch authoritative server state. | On reconnect or tab resume, clients query current ticket, station queue, or cashier queue. | KDS misses an order fired while offline. |
| INV-024 | Destructive actions must require confirmation in the UI. | UI confirms void, cancellation, payment settlement, and other destructive operations. | One accidental tap cancels a ticket. |
| INV-025 | All business-critical mutations must create audit evidence where required. | Audit records include actor, action, entity, reason or safe metadata, request ID, and timestamp. | Payment or role edit has no trace. |

## State Transition Tables

### Ticket Status Transitions

| ID | From | To | Allowed | Permission | Required preconditions |
|---|---|---|---|---|---|
| TST-001 | None | `OPEN` | Yes | `order:create` | Active table; no existing OPEN ticket. |
| TST-002 | `OPEN` | `CLOSED` | Yes | `order:close` | Close policy passes; UI confirmation shown. |
| TST-003 | `CLOSED` | `PAID` | Yes | `payment:create` | Valid idempotent payment; server-calculated totals. |
| TST-004 | `OPEN` | `CANCELLED` | Yes | `ticket:cancel` | Reason supplied; audit record created. |
| TST-005 | `CLOSED` | `CANCELLED` | Restricted | `ticket:cancel` plus elevated policy | Reason supplied; no payment exists; audit record created. |
| TST-006 | `CLOSED` | `OPEN` | No in first release | Not applicable | Requires separately approved reopen workflow. |
| TST-007 | `PAID` | `OPEN` | No | Not applicable | Paid tickets are immutable in normal operations. |
| TST-008 | `CANCELLED` | `OPEN` | No | Not applicable | Cancelled tickets are terminal in normal operations. |
| TST-009 | `CANCELLED` | `PAID` | No | Not applicable | Cancelled tickets are not payable. |

### Order-Line Status Transitions

| ID | From | To | Allowed | Permission | Required preconditions |
|---|---|---|---|---|---|
| LST-001 | None | `NEW` | Yes | `order:update` | Ticket is OPEN; item available; station resolved; snapshots created. |
| LST-002 | `NEW` | `PREPARING` | Yes | `line:status:kitchen` or `line:status:bar` | Permission matches stored station type. |
| LST-003 | `PREPARING` | `READY` | Yes | `line:status:kitchen` or `line:status:bar` | Permission matches stored station type. |
| LST-004 | `READY` | `SERVED` | Yes | `order:update` | Actor can access ticket; line is READY. |
| LST-005 | `NEW` | `VOID` | Yes | `line:void` | Reason supplied; audit record created. |
| LST-006 | `PREPARING` | `VOID` | Yes | `line:void` | Reason supplied; policy allows void during preparation; audit record created. |
| LST-007 | `READY` | `VOID` | Yes | `line:void` | Reason supplied; line not served; audit record created. |
| LST-008 | `READY` | `NEW` | No | Not applicable | Reverse transition corrupts station history. |
| LST-009 | `SERVED` | `PREPARING` | No | Not applicable | Served item cannot return to preparation. |
| LST-010 | `VOID` | Any active status | No | Not applicable | VOID is terminal in the first release. |

## Business Rule IDs

| ID | Rule |
|---|---|
| BR-001 | The waiter must select an active table before opening or resuming a ticket. |
| BR-002 | The system must create or load exactly one OPEN ticket for a table. |
| BR-003 | Draft order totals shown to a waiter are estimates until the server accepts the fire request. |
| BR-004 | Firing lines must resolve stations and create immutable snapshots on the server. |
| BR-005 | Station users may process only lines assigned to stations covered by their permissions. |
| BR-006 | READY lines must notify the correct waiter/table and remain visible until handled. |
| BR-007 | The waiter may mark only READY lines as SERVED. |
| BR-008 | Additional rounds may be added only while the ticket is OPEN. |
| BR-009 | Closing a ticket blocks all future line additions and sends the ticket to cashier. |
| BR-010 | Payment settles the ticket exactly once and releases the table. |

## Happy-Path Examples

### HP-001: One Table, One Ticket, One Payment

1. Waiter opens Table T4.
2. Server creates one OPEN ticket and marks T4 occupied.
3. Waiter fires food and drink lines.
4. Server snapshots item data and routes food to Kitchen and drink to Bar.
5. Stations advance lines to READY.
6. Waiter marks READY lines SERVED.
7. Waiter closes the ticket.
8. Cashier records one idempotent payment.
9. Server marks the ticket PAID and releases T4.

### HP-002: Menu Price Changes After Fire

1. A waiter fires a Burger line at 1,450.00 LKR.
2. The line stores `priceSnapshotMinor` using configured minor units.
3. A manager later changes Burger to 1,600.00 LKR.
4. The existing ticket and receipt still use the original snapshot.

### HP-003: Waiter Plus Bar Permissions

1. A user has Waiter and Bar roles.
2. Effective permissions are the union of both roles.
3. The user can open tickets and update Bar lines.
4. The user cannot update Kitchen lines without Kitchen permission.

## Failure Examples

| ID | Failure | Expected result |
|---|---|---|
| FAIL-001 | Two open-ticket requests target the same table. | One OPEN ticket exists; the second request receives the existing ticket or a conflict response without duplication. |
| FAIL-002 | Client sends a line without a station. | Server ignores client station data and resolves station from menu item; if unresolved, request fails. |
| FAIL-003 | User tries to pay a PAID ticket again. | Server returns original idempotent result or rejects as already paid without creating payment. |
| FAIL-004 | Waiter tries to close a ticket with unfinished lines. | Server blocks or applies explicit approved policy; UI explains the reason. |
| FAIL-005 | Real-time READY event is missed. | Client re-fetches authoritative state after reconnect and displays current READY lines. |
| FAIL-006 | Manager cancels without a reason. | Server rejects cancellation and does not mutate ticket state. |

## Edge Cases

| ID | Edge case | Required handling |
|---|---|---|
| EDGE-001 | Browser refresh during draft order. | Draft may be preserved locally, but server state remains authoritative. |
| EDGE-002 | User role changes while the user is logged in. | Server checks current effective permissions on protected requests. |
| EDGE-003 | Duplicate station status tap. | Only one valid transition is persisted. |
| EDGE-004 | Payment timeout. | Cashier must check payment status before retrying; same idempotency key must not duplicate settlement. |
| EDGE-005 | Order line is voided after ticket totals were displayed. | Server recalculates authoritative totals from non-VOID lines and approved adjustments. |
| EDGE-006 | Station screen reconnects after network loss. | Station queue is re-fetched from the server. |

## Prohibited Implementation Patterns

| ID | Pattern | Why prohibited |
|---|---|---|
| PRO-001 | Hard-coding role checks such as `user.role === "waiter"`. | Breaks multi-role permission model. |
| PRO-002 | Trusting client-supplied prices, totals, station IDs, or permissions. | Allows financial and routing corruption. |
| PRO-003 | Using real-time events as the source of truth. | Events may be delayed, duplicated, stale, or missed. |
| PRO-004 | Allowing payment without idempotency protection. | Can create duplicate payments. |
| PRO-005 | Updating historical order-line prices after menu edits. | Breaks receipt and billing integrity. |
| PRO-006 | Allowing destructive actions without confirmation and audit where required. | Creates operational and accountability risk. |

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-001 | Every required invariant from Guide 02 is explicitly documented with an ID. |
| AC-002 | Ticket and order-line state transitions are documented separately. |
| AC-003 | Permission-based authorization and multi-role union are documented. |
| AC-004 | Station-scoped access rules prevent cross-station updates. |
| AC-005 | Money, snapshots, idempotency, audit, and real-time reconciliation rules are documented. |
| AC-006 | Happy paths, failure examples, edge cases, and prohibited patterns are documented. |

## Guide 02 Exit-Criteria Checklist

- [x] `docs/domain/order-lifecycle.md` exists.
- [x] `docs/domain/invariants.md` exists.
- [x] Ticket status and order-line status are defined separately.
- [x] Every developer and AI agent can explain that ticket status tracks the whole bill while line status tracks individual preparation and service.
- [x] Core invariants are documented before database model or screen work begins.
- [x] Status transitions include allowed, restricted, and forbidden transitions.
- [x] Station routing and station-scoped permissions are documented.
- [x] First-release exclusions are documented.
- [x] No application source code is required for this guide.

## Definition Of Done

- All Guide 02 business invariants are documented with explicit rule IDs.
- The documents are clear enough for implementation agents to build models, services, routes, and UI without inventing lifecycle rules.
- No application source code, package installation, or framework scaffold is created by this guide.
- The progress tracker records Guide 02 completion and identifies Guide 03 as the next guide.
