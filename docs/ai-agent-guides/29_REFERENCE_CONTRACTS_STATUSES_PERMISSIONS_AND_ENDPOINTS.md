---
title: Reference Contracts - Statuses, Permissions, Endpoints, and Events
order: 29
phase: reference
status: ready
---

# Reference Contracts

## Ticket status

```ts
export const TicketStatus = ['OPEN', 'CLOSED', 'PAID', 'CANCELLED'] as const;
```

## Order-line status

```ts
export const LineStatus = ['NEW', 'PREPARING', 'READY', 'SERVED', 'VOID'] as const;
```

## Permissions

```text
user:manage
role:manage
menu:manage
table:manage
table:read
order:create
order:update
order:close
line:read:kitchen
line:read:bar
line:status:kitchen
line:status:bar
line:void
ticket:cancel
payment:create
receipt:print
report:view
audit:view
```

## Core endpoints

```text
POST   /api/auth/login
GET    /api/menu
POST   /api/menu/items
GET    /api/tables
POST   /api/tickets
GET    /api/tickets/:id
POST   /api/tickets/:id/lines
PATCH  /api/lines/:id/status
POST   /api/tickets/:id/close
GET    /api/cashier/queue
POST   /api/tickets/:id/pay
GET    /api/tickets/:id/receipt
POST   /api/roles
PATCH  /api/roles/:id
POST   /api/users
GET    /api/reports/sales
POST   /api/realtime/auth
```

## Standard response envelope

Success:

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

Error:

```json
{
  "error": {
    "code": "TICKET_NOT_OPEN",
    "message": "This ticket is no longer open.",
    "details": {}
  },
  "meta": {
    "requestId": "..."
  }
}
```

## Event names

```text
line.created.v1
line.status-changed.v1
ticket.updated.v1
ticket.closed.v1
ticket.paid.v1
permissions.changed.v1
```

## Recommended error codes

```text
UNAUTHENTICATED
FORBIDDEN
VALIDATION_FAILED
RESOURCE_NOT_FOUND
TABLE_ALREADY_OPEN
TICKET_NOT_OPEN
ILLEGAL_STATUS_TRANSITION
MENU_ITEM_UNAVAILABLE
IDEMPOTENCY_CONFLICT
TICKET_ALREADY_PAID
PAYMENT_AMOUNT_INVALID
REALTIME_PUBLISH_FAILED
```

## Versioning rule

Breaking API or event changes require a new version. Additive fields may remain in the same version when clients safely ignore unknown fields.
