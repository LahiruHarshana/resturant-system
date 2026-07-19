---
title: Reports and Audit Logs
order: 19
phase: operations
status: not-started
---

# Reports and Audit Logs

## Objective

Provide operational visibility without slowing transaction workflows.

## First-release reports

- Sales by day.
- Sales by menu item.
- Sales by station or category.
- Sales by waiter.
- Payment method summary.
- Average ticket value.
- Preparation duration from fired to ready.
- Void and cancellation summary.

## Query design

- Report from PAID tickets and stored snapshots.
- Use date range filters with a bounded maximum.
- Add indexes for common time and status filters.
- Use aggregation pipelines with projections early.
- Paginate detailed results.
- Do not run large report aggregations on every dashboard render.

## Summary caching

For one restaurant, calculate recent summaries on demand and cache briefly. If data volume grows, create daily summary documents updated after payment.

## Audit events

At minimum record:

- Login security events when appropriate.
- User activation/deactivation.
- Role and permission edits.
- Table opening and ticket closure when required.
- Line void with reason.
- Ticket cancellation with reason.
- Discount approval.
- Payment and reprint.

Suggested audit fields:

```ts
{
  actorId,
  action,
  entity,
  entityId,
  meta,
  requestId,
  ipHash,
  at
}
```

Do not store passwords, tokens, card details, or unnecessary personal data in `meta`.

## Admin UX

- Date range picker with presets.
- Clear totals and trend cards.
- Tables with sorting, search, pagination, and export when approved.
- Audit detail drawer showing before/after summaries for sensitive edits.

## Tests

- Cancel and void actions create audit entries.
- Reports include only PAID tickets where intended.
- Date boundaries and timezone are correct.
- Large result requests are bounded.

## Exit gate

Managers can explain daily sales and trace sensitive operational changes without direct database access.
