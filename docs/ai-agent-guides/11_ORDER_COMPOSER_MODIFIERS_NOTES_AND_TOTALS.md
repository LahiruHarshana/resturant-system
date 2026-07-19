---
title: Order Composer, Modifiers, Notes, and Totals
order: 11
phase: ordering-loop
status: not-started
---

# Order Composer, Modifiers, Notes, and Totals

## Objective

Create the fastest possible waiter ordering interface while keeping server totals authoritative.

## Screen structure

1. Sticky ticket header with table, ticket number, and guest count.
2. Search field.
3. Sticky horizontal category tabs.
4. Compact menu item grid or list.
5. Item customization sheet.
6. Persistent bottom cart bar with item count and estimated total.
7. Review-and-fire screen or drawer.

## Item interaction

A simple item with no modifiers can be added in one tap. An item with modifiers opens a bottom sheet containing:

- Quantity stepper.
- Required and optional modifier groups.
- Note field with quick note chips.
- Add or update button.

## Client state

Use Zustand only for the unsent local draft cart. Persist it by ticket ID in session storage so a browser refresh does not immediately lose work. Clear the draft only after the server acknowledges the fire request.

## Validation

Validate modifier group rules on both client and server. Reject unavailable or inactive items during submission even if they remain in a stale client cache.

## Totals

The client may show an estimate. The server must:

1. Load current menu items and modifiers.
2. Ignore client prices.
3. Calculate each line in minor units.
4. Create snapshots.
5. Recompute ticket totals.
6. Return authoritative totals.

## Duplicate-submission protection

Generate a `clientMutationId` for each fire action. The server must treat repeated requests with the same ID and ticket scope as the same operation.

## UX speed rules

- Prefetch menu after login or floor-view load.
- Keep category switching local after initial fetch.
- Use text-first cards; defer nonessential images.
- Do not animate large layout changes.
- Keep customization transitions around 150-200ms.
- Keep the primary fire button visible when the cart is non-empty.

## Accessibility

- Quantity controls have labels.
- Modifier groups expose required state.
- The bottom sheet traps and restores focus correctly.
- Notes have a useful character limit and remaining count.

## Tests

- Required modifier validation.
- Server ignores manipulated price.
- Unavailable item rejected with actionable response.
- Draft preserved across refresh.
- Repeated `clientMutationId` does not duplicate lines.

## Exit gate

A waiter can add common items rapidly, review the order, and submit without navigating through multiple pages.
