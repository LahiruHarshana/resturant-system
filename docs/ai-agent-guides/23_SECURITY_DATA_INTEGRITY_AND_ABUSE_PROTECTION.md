---
title: Security, Data Integrity, and Abuse Protection
order: 23
phase: security
status: not-started
---

# Security, Data Integrity, and Abuse Protection

## Objective

Protect staff accounts, financial operations, real-time channels, and stored data.

## Authentication security

- Bcrypt password hashing with measured cost at or above the approved baseline.
- Hashed PINs with lockout.
- Generic login errors.
- Secure cookies and HTTPS.
- Session invalidation for deactivated users and password resets.
- Rate limiting for login and PIN attempts.

## Authorization security

- Server-side permission guard on every protected route.
- Station-scoped checks based on stored line station.
- Private real-time channels with server authorization.
- No trust in client-hidden buttons.

## Input protection

- Zod validation for body, params, and query strings.
- Length limits for names, notes, and reasons.
- Escape rendered user-entered content.
- Reject unknown fields on sensitive requests.
- Avoid building Mongo query operators from raw client objects.

## Financial integrity

- Integer money.
- Server-calculated totals.
- Price and name snapshots.
- Idempotent payment.
- Audit discounts, voids, cancellations, and reprints.
- Never store full card data; record only safe payment metadata.

## State integrity

- Enforce legal status transitions in one domain module.
- Use entity versioning or optimistic concurrency for contested updates.
- Use unique and partial indexes for invariants.
- Use transactions where appropriate, with logical guards as backup.

## Logging and privacy

Never log:

- Passwords or PINs.
- Session tokens.
- Pusher secrets.
- MongoDB credentials.
- Full payment card details.

Redact sensitive request fields and use request IDs for tracing.

## Security tests

- Unauthenticated request.
- Wrong permission.
- Cross-station line update.
- Subscription to unauthorized channel.
- NoSQL operator injection attempt.
- Duplicate payment.
- Stale status update.
- Inactive account with old session.

## Exit gate

A security review finds no client-only authorization, plaintext secrets, unvalidated mutation input, illegal status bypass, or non-idempotent settlement path.
