# Admin Core Operations

## Overview
The Admin Core manages the foundational configuration required to operate the restaurant. It provides interfaces for managing Stations, Menu Categories, Menu Items, Zones, Tables, Users, Roles, and general Restaurant Settings.

## Entities
1. **Stations**: Defines preparation areas (e.g., Kitchen, Bar) where order tickets are routed. Stations can be deactivated but not deleted if referenced by menu items.
2. **Menu Categories**: Groups menu items logically. Supports reordering.
3. **Menu Items**: Core offerings. Includes pricing (stored in minor units), station routing, and modifier configurations (min/max selections, price deltas).
4. **Zones & Tables**: Physical layout of the restaurant. Tables track seating capacity and cannot be deleted while assigned to an active ticket.
5. **Users**: Staff accounts. Supports multi-role assignments, password login, and PIN-based quick login.
6. **Roles**: Permission-based roles using exact permission keys.
7. **Settings**: Singleton configuration for currency, taxes, service charges, and kitchen aging thresholds.

## Security & Authorization
- Every API route and Server Action enforces `requirePermission()` checks.
- Mongoose schemas provide a secondary defense against malformed or out-of-bounds data.
- Zod schemas act as the single source of truth for all validation (client forms and server payloads).

## Safe Deletion
Hard deletion is prevented for critical operational entities (e.g., Stations, Categories, Tables) if they are actively referenced. Deactivation (soft delete via `isActive: false` or `isAvailable: false`) is the preferred method for retiring entities without breaking historical order snapshots.
