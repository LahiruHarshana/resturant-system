# Order Composer, Modifiers, Notes, and Totals

This document covers the implementation guidelines and invariants for the waiter's order composer functionality, managing order lines, capturing snapshots, and calculating financial totals safely.

## Core Directives
1. **Server as Authority:** The client browser is fundamentally untrusted. Submitted item IDs, names, prices, modifiers, totals, station IDs, or statuses MUST be disregarded or re-verified by the server. Only the `menuItemId`, `quantity`, `note`, and valid `modifier` configurations are accepted.
2. **Immutability of History (Snapshots):** The moment an order line is created, the item's name, price, modifier options, and their respective price deltas are snapshotted into the `OrderLine`. Subsequent changes to the `MenuItem` or its configuration in the Admin dashboard DO NOT retroactively alter submitted or active order lines.
3. **Minor Currency Units:** All financial arithmetic (subtotals, tax, service charges, and totals) is strictly calculated using integer minor units (e.g. cents). Floating point math is strictly forbidden.
4. **Idempotency:** Waiter network environments are unstable. Network retries resulting in duplicate submissions must be safely handled using idempotency keys. Duplicate identical requests should return the initially processed result rather than creating duplicates.
5. **Ticket State Enforcement:** Order lines can only be composed and fired onto a `Ticket` if it is in an `OPEN` state. Submissions to `PAID`, `CLOSED`, or `CANCELLED` tickets must be rigorously rejected.

## Functional Requirements
- **Modifier Validation:**
  - Group requirements: `minSelections` and `maxSelections` rules must be strongly enforced.
  - Required Groups: Missing required modifiers lead to request rejection.
  - Data Integrity: Reject unknown modifier options or options that belong to different items.
- **Quantity & Notes:**
  - `quantity` must be bounded (e.g. 1 to 99).
  - `note` string length must be capped and sanitized to prevent abuse.
- **Calculations Flow:**
  - The sum of snapshotted `priceMinor` + `modifierPriceDeltaMinor` * `quantity` determines the `subtotalMinor`.
  - Service charges and taxes (if enabled/configured via `RestaurantSettings`) are calculated derived exclusively from `subtotalMinor`.
- **Concurrency:**
  - Standard database lock or document-level versioning ensures concurrent line additions yield a consistent total.

## Canonical Permissions
- **Viewing Menu:** `menu:read` or implicit via `order:create`
- **Viewing Ticket:** `ticket:read`
- **Adding Order Lines:** `order:create`
- **Editing Draft Lines:** Generally `order:create` covers this since draft lines are transient and client-side until "fired".

## UI and Workflows
- **Draft Cart:** Selections are cached client-side utilizing `zustand` to prevent data loss. Firing clears the cart on success.
- **Interactive Composer:** The interface uses component-level states, modals/sheets, and responsive designs accessible without full-page reloads.
