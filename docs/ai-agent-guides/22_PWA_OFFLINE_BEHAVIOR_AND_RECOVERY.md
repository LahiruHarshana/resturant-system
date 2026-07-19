---
title: PWA, Offline Behavior, and Recovery
order: 22
phase: resilience
status: not-started
---

# PWA, Offline Behavior, and Recovery

## Objective

Make the waiter experience installable and resilient without creating unsafe offline financial behavior.

## PWA scope

Cache:

- Application shell.
- Fonts and icons.
- Recent menu and category data.
- Static table metadata.

Do not treat cached operational state as authoritative.

## Offline policy

### Allowed offline

- View the last cached menu.
- Build a local draft order.
- View a clearly marked last-known ticket snapshot.

### Not automatically committed offline

- Opening a table.
- Firing order lines.
- Closing a ticket.
- Advancing station status.
- Recording payment.

These actions require server confirmation because duplicates or conflicts are operationally dangerous.

## Reconnection workflow

1. Show an offline banner immediately.
2. Preserve local draft with its ticket context.
3. On reconnect, reauthenticate if necessary.
4. Fetch the current table, ticket, and menu versions.
5. Detect conflicts such as a closed ticket or unavailable item.
6. Let the waiter review changes.
7. Submit with a new or preserved idempotency key.

## Install UX

- Provide a manifest, icons, and theme colors.
- Show an install suggestion only after the user has engaged with the app.
- Do not repeatedly interrupt staff.
- Support full-screen standalone mode.

## Device behavior

- Keep critical controls above safe-area insets.
- Avoid dependence on hover.
- Prevent screen sleep on station displays when permitted and enabled.
- Handle browser audio permission explicitly.

## Tests

- App shell opens after a network loss.
- Draft survives refresh.
- Offline mutation is blocked with clear explanation.
- Reconnect detects a closed ticket conflict.
- Duplicate submit after reconnection is prevented by idempotency.

## Exit gate

Network loss is visible, drafts are protected, and no offline behavior can silently create duplicate or financially inconsistent operations.
