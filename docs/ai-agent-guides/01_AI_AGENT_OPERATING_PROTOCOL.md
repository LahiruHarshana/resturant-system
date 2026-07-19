---
title: AI Agent Operating Protocol
order: 1
phase: governance
status: not-started
---

# AI Agent Operating Protocol

## Objective

Ensure that every AI coding agent works predictably, preserves architecture, avoids destructive changes, and leaves the repository in a verifiable state.

## Required agent behavior

### Before coding

1. Read `00_README.md`, this file, the current task guide, and its dependencies.
2. Inspect the repository tree, package manifest, environment template, database models, API routes, and tests.
3. Identify existing conventions before creating new ones.
4. Write a short implementation plan containing:
   - Files to create or edit.
   - Data model or API changes.
   - Tests to add.
   - Performance impact.
   - Migration or rollback requirements.
5. Confirm that the requested work belongs to the current phase.

### While coding

- Use TypeScript strict mode and avoid `any`.
- Prefer small domain services over business logic inside React components or route handlers.
- Keep route handlers thin: authenticate, authorize, validate, call a service, map the response.
- Never trust client-supplied prices, station IDs, totals, permissions, or status transitions.
- Never hard-code role names in authorization logic.
- Never add a new dependency when the existing stack can solve the problem cleanly.
- Never silently change a contract used by another phase.
- Avoid broad refactors during feature work.
- Add comments only for non-obvious decisions, not for obvious syntax.

### After coding

Run, at minimum:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run relevant Playwright tests when the change affects a user flow.

## Required output from every agent task

The handoff must contain:

```text
Task:
Status: completed | partial | blocked
Files changed:
Database changes:
API or event contract changes:
Tests added or updated:
Commands executed:
Known limitations:
Next recommended guide:
```

## Change control rules

Create an Architecture Decision Record under `docs/adr/` before changing any of these:

- Next.js monolith architecture.
- MongoDB as the main database.
- Permission-based authorization.
- Ticket and order-line status models.
- Real-time provider abstraction.
- Money storage format.
- API response envelope.

## Definition of done for an agent task

A task is complete only when:

- The implementation matches the guide.
- Validation passes.
- Error, loading, empty, and permission-denied states exist where applicable.
- Performance-sensitive queries use indexes and projections.
- Security checks are server-side.
- Documentation and progress tracking are updated.
