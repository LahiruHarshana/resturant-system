# Environment Configuration

## Purpose

This document explains how the application separates local, test, preview, and production configuration without committing secrets. It does not define database models or persistence; those belong to Guide 06.

## Environment Files

Commit only `.env.example`. Real secret files such as `.env`, `.env.local`, `.env.development.local`, `.env.test.local`, and `.env.production.local` are ignored by `.gitignore`.

Use `.env.example` as the placeholder template and copy values into local secret files or hosting platform secret storage. Never paste real credentials into committed files.

## Required Variables

| Variable | Scope | Notes |
|---|---|---|
| `NODE_ENV` | Server | Must be `development`, `test`, or `production`. |
| `APP_URL` | Server | Absolute application URL. Production must use HTTPS. |
| `MONGODB_URI` | Server | MongoDB URI with an explicit database name. No connection is opened in Guide 05. |
| `AUTH_SECRET` | Server | Long random value used by authentication in later guides. |
| `AUTH_TRUST_HOST` | Server | Boolean string such as `true` or `false`. |
| `PUSHER_APP_ID` | Server | Server-only Pusher application ID. |
| `PUSHER_KEY` | Server | Server-side Pusher key. |
| `PUSHER_SECRET` | Server | Server-only Pusher secret. |
| `PUSHER_CLUSTER` | Server | Server-side Pusher cluster. |
| `NEXT_PUBLIC_PUSHER_KEY` | Browser-safe | Public Pusher key only. |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Browser-safe | Public Pusher cluster only. |

## Optional Variables

| Variable | Scope | Notes |
|---|---|---|
| `CLOUDINARY_URL` | Server | Optional media configuration. Validated as a URL when present. |
| `RESEND_API_KEY` | Server | Optional email provider key. Validated when present. |
| `SENTRY_DSN` | Server | Optional monitoring DSN. Validated as a URL when present. |

## Database Separation

Database separation is represented in `MONGODB_URI` by using separate database names at minimum. Separate Atlas projects are preferred when operationally practical.

Required naming convention:

- Local development database names include `dev`, `development`, or `local`.
- Automated test database names include `test` and must not include `prod` or `production`.
- Preview deployment database names include `preview` and must not include `prod` or `production`.
- Production database names include `prod` or `production`.

The Guide 05 validator checks these names but does not connect to MongoDB. MongoDB connection management and models are deferred to Guide 06.

## AUTH_SECRET Generation

Generate a strong value locally with a cryptographic tool and store it only in the local secret file or hosting platform secrets. Example command:

```bash
openssl rand -base64 48
```

Do not commit the generated value.

## Hosting Secrets

Store preview and production secrets in the deployment platform, such as Vercel project environment variables. Preview must point to preview services and databases. Production must point to production services and databases.

## Secret Rotation

Rotate credentials when a staff member with secret access leaves, a secret may have been exposed, or provider policy requires rotation. Keep any real secret inventory in protected operations storage outside this repository.

## Validation Failures

Environment validation failures name the invalid variable and rule. They do not print full connection strings, tokens, or secret values.

## Client Secret Leakage Check

Run:

```bash
npm run security:check-client-env
```

The check builds the application with controlled sentinel values and scans client/static output for server-only sentinels. It reports variable names only if leakage is detected.

## Deferred Work

Guide 06 will implement MongoDB connection handling, models, indexes, and persistence for configuration records. Guide 09 will add the Admin settings interface. Guide 05 only defines validated environment and settings contracts.
