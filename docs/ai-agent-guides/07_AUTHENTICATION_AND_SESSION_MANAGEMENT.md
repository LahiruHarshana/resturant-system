---
title: Authentication and Session Management
order: 7
phase: identity
status: not-started
---

# Authentication and Session Management

## Objective

Implement secure staff login with Auth.js credentials authentication and JWT sessions.

## Login methods

1. Email and password for admin, manager, and normal staff access.
2. Optional staff PIN for approved shared POS devices.

Do not implement public self-registration.

## Password login

- Normalize email before lookup.
- Load only the fields needed for authentication.
- Compare with bcrypt at cost 12 or the approved measured cost.
- Reject inactive users.
- Return one generic invalid-credentials message.
- Record failed attempts without logging the password.

## PIN login

- Store `pinHash`, not `pin`.
- Require a selected user or staff identifier plus PIN; do not let a short PIN be the only global identifier.
- Apply attempt throttling and temporary lockout.
- Make PIN login configurable per user and device policy.
- Require password reauthentication for sensitive admin actions.

## JWT content

Keep the token small:

```ts
{
  sub: userId,
  name,
  rolesVersion,
  sessionVersion
}
```

Do not store the full permission list permanently in a long-lived token. Compute permissions at login and refresh them when role versions change, or include a short-lived permission cache with version invalidation.

## Session security

- Use secure, HTTP-only, same-site cookies.
- Use HTTPS in production.
- Rotate or invalidate sessions when a user is deactivated.
- Increment `sessionVersion` after password reset or account compromise.
- Set a reasonable idle and absolute session lifetime.

## Required files

```text
src/auth.ts
src/server/auth/authorize-credentials.ts
src/server/auth/session.ts
src/server/auth/password.ts
src/server/auth/pin.ts
src/app/(auth)/login/page.tsx
```

## Login UX

- Large fields and submit button.
- Password visibility toggle.
- Clear loading state.
- Plain-language failure message.
- No disclosure of whether an account exists.
- Keyboard and screen-reader support.

## Tests

- Valid password.
- Invalid password.
- Inactive user.
- Locked PIN.
- Session invalidation after `sessionVersion` change.
- No password or hash in session payload.

## Exit gate

A seeded Super Admin can sign in, inactive users cannot sign in, and all protected routes reject unauthenticated requests.
