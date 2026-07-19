---
title: Repository Bootstrap and Structure
order: 4
phase: foundation
status: not-started
---

# Repository Bootstrap and Structure

## Objective

Create a clean Next.js 15 TypeScript repository with strict quality gates and a structure that multiple AI agents can modify safely.

## Bootstrap

```bash
npx create-next-app@15 restaurant-roms \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*"
cd restaurant-roms
```

Install the baseline packages using versions compatible with Next.js 15 and commit the lockfile:

```bash
npm install mongoose zod bcryptjs next-auth@beta \
  @tanstack/react-query zustand \
  pusher pusher-js \
  react-hook-form @hookform/resolvers \
  lucide-react
npm install -D prettier prettier-plugin-tailwindcss \
  vitest @vitest/coverage-v8 mongodb-memory-server \
  @playwright/test eslint-plugin-security
npx shadcn@latest init
```

## Required scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format:check": "prettier --check .",
    "format:write": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

## Create the directory structure

```text
src/
  app/
    (auth)/
    (waiter)/
    (station)/
    (cashier)/
    (admin)/
    api/
  components/
    ui/
    feedback/
    layout/
  features/
    auth/
    tables/
    ordering/
    stations/
    cashier/
    admin/
  server/
    auth/
    db/models/
    db/migrations/
    rbac/
    services/
    realtime/
  shared/
    contracts/
    errors/
    money/
    constants/
    utils/
tests/
  unit/
  integration/
  e2e/
docs/
  adr/
  architecture/
  domain/
```

## TypeScript and lint rules

- Enable strict mode.
- Enable `noUncheckedIndexedAccess`.
- Reject unused imports.
- Do not suppress errors with `@ts-ignore` without a linked issue.
- Use absolute `@/` imports.
- Use server-only modules for secrets and database access.

## Foundation UI

Create:

- Global font and spacing tokens.
- `AppShell`, `PageHeader`, `EmptyState`, `ErrorState`, `LoadingSkeleton`, and `PermissionDenied` components.
- Toast provider.
- Query provider.
- Error boundary and not-found page.

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Exit gate

A clean clone must install, run, test, and build without local undocumented steps.
