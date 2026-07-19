---
title: CI/CD, Deployment, and Environment Promotion
order: 26
phase: deployment
status: not-started
---

# CI/CD, Deployment, and Environment Promotion

## Objective

Provide repeatable deployment from pull request to production.

## Environments

```text
Local -> Pull Request Preview -> Staging/Preview -> Production
```

Use isolated database names and secrets.

## GitHub Actions pipeline

On pull request and push to the main branch, run:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Run Playwright against a deployed preview or controlled test environment for release candidates.

## Deployment baseline

Recommended first release:

- Next.js on Vercel.
- MongoDB Atlas Free cluster for the initial small deployment.
- Pusher private channels for real-time.
- Cloudinary or equivalent for optimized menu images.

Keep the real-time provider abstract so the application can move to Socket.IO or another provider later.

## Database deployment safety

1. Run backward-compatible migrations before code that requires them.
2. Deploy application code.
3. Verify health and smoke tests.
4. Remove old fields only in a later release.

## Release metadata

Expose or log:

- Git commit SHA.
- Build time.
- Environment.
- Schema migration version.

## Smoke test after deployment

- Login.
- Open a table.
- Fire one Kitchen and one Bar item.
- Advance both lines.
- Confirm waiter alert.
- Close ticket.
- Pay and confirm table is free.
- Open receipt.
- Confirm admin can view the audit trail.

## Rollback

Document the previous working deployment, database compatibility, and migration rollback or forward-fix strategy. Never roll back code blindly after an irreversible schema migration.

## Exit gate

A production deployment can be reproduced from source control, automatically validated, smoke-tested, and safely rolled back or forward-fixed.
