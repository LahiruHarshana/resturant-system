---
title: Current Official Implementation Notes
order: 32
phase: reference
status: ready
review_date: 2026-07-04
---

# Current Official Implementation Notes

This file records time-sensitive implementation notes that agents must verify against official documentation before upgrades.

## Next.js 15

- Use App Router Route Handlers under the `app` directory.
- GET Route Handlers are not cached by default in Next.js 15.
- `params`, `searchParams`, `cookies()`, and `headers()` use asynchronous patterns in Next.js 15.
- Keep Mongoose and other Node-specific dependencies on the Node.js runtime.

Official references:

- https://nextjs.org/docs/app/getting-started/route-handlers
- https://nextjs.org/docs/app/guides/upgrading/version-15
- https://nextjs.org/docs/messages/sync-dynamic-apis

## Auth.js

- Use the official Next.js integration and Credentials provider documentation.
- Auth.js supports JWT and database session strategies; this project uses JWT sessions with server-side user and permission freshness checks.

Official references:

- https://authjs.dev/reference/nextjs
- https://authjs.dev/getting-started/authentication/credentials
- https://authjs.dev/concepts/session-strategies

## MongoDB Atlas

- The product UI and documentation may refer to the old M0 tier as a Free cluster.
- Free clusters are intended for small-scale development or initial workloads and have feature limitations.
- Verify backup, connection, storage, and operational limits before production launch.

Official references:

- https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/

## Pusher Channels

- Use private channels for station, table, cashier, admin, and user-specific data.
- Channel subscription must be authorized by a server endpoint.

Official references:

- https://pusher.com/docs/channels/using_channels/private-channels/
- https://pusher.com/docs/channels/server_api/authorizing-users/
- https://pusher.com/docs/channels/getting_started/javascript/

## Review rule

Before changing framework or provider versions:

1. Review official migration notes.
2. Run all unit, integration, E2E, and load smoke tests.
3. Record an ADR.
4. Update this file's review date.
