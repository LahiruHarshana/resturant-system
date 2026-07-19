---
title: Modern UI and UX Design System
order: 20
phase: experience
status: not-started
---

# Modern UI and UX Design System

## Objective

Create a modern, friendly interface that improves service speed rather than adding visual complexity.

## Design principles

1. Operational clarity before decoration.
2. One obvious primary action per context.
3. Large touch targets and short paths.
4. Consistent status language across all personas.
5. Immediate feedback for every tap.
6. Progressive disclosure for advanced controls.
7. Motion must explain change, not delay work.

## Responsive targets

- Waiter: 360-430px phone widths first.
- Station: landscape tablet and 1366px or larger displays.
- Cashier: tablet and desktop.
- Admin: desktop first, responsive to tablet.

## Token system

Define CSS variables for:

- Brand accent.
- Neutral surfaces and borders.
- Text hierarchy.
- Success, warning, danger, and information.
- Radius, shadow, spacing, and motion duration.

Keep status semantics consistent:

```text
Free / Ready / Paid       success
Preparing / attention     warning
Aging / destructive       danger
New / informational       info
```

Use labels and icons in addition to color.

## Typography

- Use one highly legible interface family.
- Avoid decorative fonts on operational screens.
- Station item names and quantities must be readable at distance.
- Use tabular numerals for money and timers.

## Core reusable components

- Role-aware `AppShell`.
- `StatusBadge`.
- `MoneyText`.
- `ElapsedTimer`.
- `ActionButton` with loading and success states.
- `ConfirmActionDialog`.
- `ConnectionBanner`.
- `EmptyState`, `ErrorState`, and skeletons.
- `PermissionGate` for presentation only.

## Motion

- 150-200ms for sheets, drawers, and state changes.
- Respect `prefers-reduced-motion`.
- Never animate the entire KDS grid on each event.
- Use subtle scale or highlight for newly updated cards.

## Friendly error language

Bad: “Mutation failed: 409.”

Good: “This table already has an open ticket. The current ticket has been loaded.”

Every recoverable error should include a retry or next action.

## Accessibility

- WCAG AA contrast.
- Keyboard navigation for cashier and admin.
- Focus management in dialogs and sheets.
- Screen-reader labels for icon buttons.
- Live regions for READY alerts and important status changes.
- No destructive action without confirmation.

## UX acceptance targets

- New waiter productive within five minutes.
- Common order fired in under 15 seconds.
- Primary actions available in at most two taps from the current context.
- No silent failures.
- No page reload required for operational updates.

## Exit gate

A design review confirms consistency across waiter, station, cashier, and admin workspaces, including loading, empty, error, offline, and permission states.
