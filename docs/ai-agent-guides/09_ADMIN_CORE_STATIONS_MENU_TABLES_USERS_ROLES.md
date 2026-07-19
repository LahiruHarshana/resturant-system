---
title: Admin Core - Stations, Menu, Tables, Users, and Roles
order: 9
phase: admin-core
status: not-started
---

# Admin Core

## Objective

Build the configuration tools required before operational ordering can start.

## Build order

1. Stations.
2. Menu categories.
3. Menu items and modifiers.
4. Zones and tables.
5. Roles and permissions.
6. Users and multi-role assignment.
7. Restaurant settings.

## Station management

Fields:

- Name.
- Type: `kitchen`, `bar`, or custom operational type.
- Active status.
- Sort order.

Block deletion when referenced. Prefer deactivation.

## Menu categories

- Name.
- Sort order.
- Active status.

Support drag or button-based reordering, but persist a stable numeric sort order.

## Menu items

Required fields:

- Name.
- Description.
- Price in display currency, converted to minor units on the server.
- Category.
- Preparation station.
- Availability.
- Sort order.
- Optional optimized image.
- Modifier groups with min/max selection rules and price deltas.

The station assignment is mandatory because it drives routing.

## Tables and zones

- Zone name.
- Table label.
- Seat count.
- Active status.
- Operational status is managed by the order workflow, not manually edited during normal service.

## Role editor

- Group checkboxes by resource.
- Show a plain-language label and technical key.
- Warn when removing a permission from active users.
- Prevent deletion of protected system roles, while still allowing controlled edits when policy permits.

## User editor

- Name, email, phone.
- Active state.
- Multiple role selection.
- Temporary password or invite workflow.
- Optional quick-login PIN setup.

Never display stored password or PIN hashes.

## UX requirements

- Responsive desktop-first admin shell.
- Search, filters, pagination, and visible active/inactive states.
- Inline validation.
- Confirmation for destructive actions.
- Optimistic list updates only when rollback is safe.
- Skeletons instead of page-blocking spinners.

## Performance requirements

- Paginate users and audit-heavy lists.
- Cache categories, stations, and settings briefly.
- Return compact list DTOs.
- Use image thumbnails, not original uploads.

## Exit gate

An administrator can configure a complete demo restaurant without database editing or developer assistance.
