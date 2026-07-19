---
title: Environments, Configuration, and Secrets
order: 5
phase: foundation
status: not-started
---

# Environments, Configuration, and Secrets

## Objective

Provide validated configuration for local, preview, test, and production environments without leaking secrets.

## Environment separation

Use separate databases for:

- Local development.
- Automated tests.
- Preview deployments.
- Production.

At minimum, use separate database names. Prefer separate Atlas projects when operationally practical.

## Environment variables

Create `.env.example`:

```dotenv
NODE_ENV=development
APP_URL=http://localhost:3000
MONGODB_URI=
AUTH_SECRET=
AUTH_TRUST_HOST=true
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
CLOUDINARY_URL=
RESEND_API_KEY=
SENTRY_DSN=
```

Only `NEXT_PUBLIC_*` variables may be exposed to the browser.

## Validate configuration at startup

Create `src/server/config/env.ts` with Zod. Parse once and fail fast with a clear error when required values are absent.

Required rules:

- Production `APP_URL` must use HTTPS.
- `AUTH_SECRET` must be long and random.
- Server-only Pusher secrets must never be exported to client code.
- Test mode must not connect to the production database.

## Secret handling

- Never commit `.env*` files except `.env.example`.
- Store preview and production values in the hosting platform.
- Rotate credentials when a staff member with access leaves.
- Keep a secret inventory in a protected operations document.
- Do not print full connection strings or tokens in logs.

## Configuration flags

Use typed configuration for values that may differ by restaurant:

```ts
interface RestaurantSettings {
  currency: string;
  currencyMinorDigits: number;
  serviceChargeBps: number;
  taxBps: number;
  receiptFooter?: string;
  readySoundEnabled: boolean;
  kitchenAgingMinutes: number;
  urgentAgingMinutes: number;
}
```

Store settings in the database and cache them briefly. Do not hard-code tax or service charge in components.

## Exit gate

The application must start with a valid environment, fail clearly with an invalid environment, and prove that no server secret is present in the client bundle.
