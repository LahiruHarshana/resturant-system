---
title: Performance and Speed Optimization
order: 21
phase: performance
status: not-started
---

# Performance and Speed Optimization

## Objective

Make speed a measurable product feature across database, server, network, rendering, and interaction layers.

## Performance budgets

Use these as initial targets and measure on real devices:

- Waiter first useful screen: under 2.5 seconds on a typical mobile connection after authentication.
- Optimistic button response: under 100ms perceived.
- Common API mutation p95: under 500ms excluding cold-start anomalies.
- Indexed database query p95: under 100ms in normal load testing.
- Initial JavaScript per role workspace: keep as small as practical; avoid loading admin code in waiter routes.
- No layout shift caused by menu images or ticket cards.

## Database speed

- Create indexes before production data grows.
- Use `.lean()` and projections.
- Avoid N+1 reads and broad `populate()`.
- Batch order-line inserts.
- Use cursor pagination.
- Store snapshots to reduce joins.
- Bound report date ranges.
- Inspect explain plans for hot queries.

## API speed

- Validate once with shared Zod schemas.
- Keep handlers thin.
- Parallelize independent reads with `Promise.all` only when safe.
- Use idempotency records rather than expensive duplicate detection.
- Return compact DTOs.
- Move noncritical audit enrichment or email work after the response when the platform supports it.

## Next.js speed

- Split route groups by persona so clients do not download unrelated UI.
- Prefer Server Components for static shells and reference data.
- Use Client Components only for interaction.
- Explicitly cache menu categories, stations, and safe settings with controlled revalidation.
- Remember that Next.js 15 GET Route Handlers are dynamic by default.
- Lazy-load report charts, PDF generation, and admin-only editors.

## Client data strategy

TanStack Query:

- Use sensible `staleTime` for menu and settings.
- Invalidate the smallest relevant query key.
- Patch real-time status changes locally and reconcile in the background.
- Avoid refetch storms after several events.

Zustand:

- Use selectors to prevent broad re-renders.
- Keep only transient draft state.
- Do not duplicate server state permanently.

## Image speed

- Use optimized WebP or AVIF thumbnails.
- Provide dimensions to prevent layout shift.
- Load images below the fold lazily.
- Make menu usable without images.
- Keep KDS free from unnecessary photography.

## Real-time speed

- Use one browser connection.
- Publish compact events.
- Batch related station notifications.
- Subscribe only to relevant channels.
- Reconcile after reconnect instead of replaying an unbounded event history.

## UX performance

- Use skeletons for predictable content shapes.
- Keep controls enabled when safe through optimistic updates.
- Prevent accidental double taps.
- Avoid full-screen spinners for localized operations.
- Preserve scroll and draft state during background refresh.

## Measurement

Add:

- Web Vitals collection.
- Server timing for major services.
- Structured logs containing route, duration, query count, and request ID.
- k6 scenarios for simultaneous waiter fires and station updates.

## Mandatory performance tests

- 10 waiters firing mixed orders concurrently.
- 2 station screens receiving updates.
- 2 cashiers viewing the queue.
- Reconnect storm after network interruption.
- Report query against representative historical data.

## Exit gate

No known unindexed hot query, N+1 station routing, oversized real-time payload, or cross-persona bundle leakage remains before release.
