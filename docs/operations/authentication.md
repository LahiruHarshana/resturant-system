# Authentication Operations Guide

## Overview

The restaurant system uses Auth.js (NextAuth) Credentials provider with JWT sessions. Staff authentication is isolated from customer systems (which do not exist yet) and does not allow public registration.

## Login Methods

- **Email and Password**: The primary method for all staff (waiters, kitchen staff, managers, admins).
- **PIN Login**: An optional 4-digit PIN for approved shared POS devices (e.g. kitchen or bar iPads). PIN login is disabled by default for all users.

## Security Policies

- **Passwords**: Hashed with `bcryptjs` (cost 12).
- **PIN Lockout**: After 5 failed PIN attempts, the user's PIN login is temporarily locked for 15 minutes.
- **Session Lifetime**: Sessions expire automatically based on `AUTH_SESSION_ABSOLUTE_HOURS` (default 12 hours). Idle session expiry is managed by Auth.js defaults (usually 30 days, but overridable).
- **Session Invalidation**: Changing a user's `sessionVersion` in the database immediately invalidates any active JWT sessions for that user on their next request. Deactivating a user (`isActive: false`) also invalidates their session.
- **Device Policy (Deferred)**: True secure device enrollment is deferred to future guides. Currently, PIN login requires `pinEnabled` to be set to `true` on the user's record.

## Bootstrapping Super Admin

Before using the system in production, you must create a Super Admin account:

```bash
BOOTSTRAP_ADMIN_NAME="Admin" \
BOOTSTRAP_ADMIN_EMAIL="admin@example.com" \
BOOTSTRAP_ADMIN_PASSWORD="super-secret-password-123!" \
npm run auth:bootstrap-admin
```

This script is idempotent and safe to run multiple times. It will not overwrite the password if the user already exists, but it will grant the `super_admin` role.

## Environment Setup

Required environment variables in `.env.local` or production:
- `AUTH_SECRET`: A 32+ character random string.
- `AUTH_TRUST_HOST`: Set to `true` if behind a reverse proxy like Nginx or Vercel.
- `APP_URL`: The full URL of the application.

## Troubleshooting

- **Invalid Credentials**: Ensure the user is active (`isActive: true`).
- **PIN not working**: Check if `pinEnabled` is true, and if the user is locked out (`pinLockedUntil` > now).
- **Session invalidation**: If a user reports being logged out, check if their `sessionVersion` was updated by an admin or security script.
