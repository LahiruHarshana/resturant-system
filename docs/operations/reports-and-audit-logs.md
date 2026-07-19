# Reports & Audit Logs

## Architecture
The system supports advanced reporting and system auditing to help administrators monitor operations and track changes securely.
All reporting queries are implemented entirely server-side, preventing client logic bypass, using Canonical Permissions (`report:view` and `audit:view`).

## Reports API
- `GET /api/admin/reports/sales`
- `GET /api/admin/reports/items`
- `GET /api/admin/reports/payments`
- `GET /api/admin/reports/performance`

**Reporting rules:**
1. All revenue reporting is strictly derived from `PAID` tickets.
2. Sales totals and metrics are transmitted as safe integer minor units.
3. No raw documents or sensitive metadata are returned in the Report DTO.

## Audit Logs API
- `GET /api/admin/audit-logs`

**Audit Log rules:**
1. The service tracks critical operations like Login, Configuration Changes, Station Activity.
2. Strict data redaction applies recursively via the Audit Log Service (e.g. `password`, `hash`, `token`, `secret`, `pin`, `card`, `cvv` are replaced with `[REDACTED]`).
3. Supports pagination and server-side filtering by actor, action, and date range.

## UI Integration
- `/admin/reports`: A secure dashboard with summary cards for Total Revenue, Paid Tickets, Average Ticket, and Exceptions. Lists top items and payment methods.
- `/admin/audit-logs`: A paginated table of system actions with a secure details view for examining redacted metadata payloads.
