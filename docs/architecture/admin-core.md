# Admin Core Architecture

The Admin Core module provides the foundation for restaurant configuration. It implements a fully server-authoritative, RBAC-protected management interface for stations, menu items, categories, zones, tables, users, roles, and settings.

## Design Principles

1. **Server-Authoritative Authorization**: Every mutation and data access operation is protected by `requirePermission()`. No client-side checks are trusted.
2. **Schema-Driven Validation**: We use `zod` schemas located in `src/shared/admin/schemas.ts` for both client-side form validation and server-side API validation.
3. **Audit Logging**: Every critical action (create/update/delete) creates an entry in `AuditLogModel` to track `actorId`, `entity`, `entityId`, and `metadata`.
4. **Idempotent Seeding**: The `db:seed-demo` script provides a reliable, repeatable way to initialize the database with a realistic restaurant configuration without duplicating data.

## Key Components

### Data Models
- **Roles & Permissions**: Fine-grained access control mapping (`RoleModel`).
- **Users**: Staff accounts with hashed passwords and optional PINs (`UserModel`).
- **Menu & Stations**: Hierarchical menu configuration (`MenuCategoryModel`, `MenuItemModel`) routed to specific prep stations (`StationModel`).
- **Zones & Tables**: Physical layout configuration (`ZoneModel`, `RestaurantTableModel`).
- **Settings**: Global configuration like currency, tax rates, and KDS aging thresholds (`RestaurantSettingsModel`).

### Security
All endpoints use the robust Next.js Route Handlers. Errors are caught centrally and sanitized to prevent leaking database internals or stack traces. Custom `AuthenticationError` and `AuthorizationError` classes handle permission denials cleanly.
