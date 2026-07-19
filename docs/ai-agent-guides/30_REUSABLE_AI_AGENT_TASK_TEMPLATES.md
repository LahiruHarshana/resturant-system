---
title: Reusable AI Agent Task Templates
order: 30
phase: reference
status: ready
---

# Reusable AI Agent Task Templates

## Feature implementation prompt

```text
Read 00_README.md, 01_AI_AGENT_OPERATING_PROTOCOL.md, and guide <NUMBER>.
Inspect the current repository before editing.
Implement only the deliverables in guide <NUMBER>.
Preserve existing architecture and contracts.
Use strict TypeScript, shared Zod schemas, thin route handlers, domain services, server-side permission checks, compact DTOs, and tests.
Prioritize fast queries, small client bundles, friendly loading/error states, accessibility, and responsive modern UI.
Run lint, typecheck, tests, and build.
Update 31_PROGRESS_TRACKER.md and provide the required handoff summary.
```

## Bug-fix prompt

```text
Reproduce the issue first and add a failing test when practical.
Find the smallest root cause.
Do not perform unrelated refactors.
Verify authorization, idempotency, status transitions, and concurrency implications.
Measure whether the fix adds a new query, re-render, or real-time event.
Run relevant unit, integration, E2E, and build checks.
Document the root cause, changed files, test evidence, and remaining risk.
```

## Performance task prompt

```text
Measure before changing code.
Identify whether the bottleneck is database, server, network, rendering, image, or real-time behavior.
Inspect query explain plans and client bundle impact.
Make one controlled change at a time.
Preserve correctness and authorization.
Report baseline, change, final measurement, and any tradeoff.
```

## UI task prompt

```text
Use the existing design tokens and shadcn/ui patterns.
Do not introduce a parallel visual system.
Include loading, empty, error, offline, permission-denied, and success states.
Meet touch target, keyboard, contrast, focus, and reduced-motion requirements.
Keep transitions short and avoid animation that delays operational actions.
Test at the persona's target device sizes.
```

## Database change prompt

```text
Define the invariant and index first.
Create an idempotent migration.
Use minor units for money and snapshots for historical values.
Avoid unbounded reads and N+1 queries.
Add concurrency and rollback tests.
Document deployment order and recovery steps.
```
