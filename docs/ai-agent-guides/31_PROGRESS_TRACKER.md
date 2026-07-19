---
title: Progress Tracker
order: 31
status: active
---

# Progress Tracker

Update this file after every completed guide.

| Guide | Workstream | Status | Owner/Agent | Evidence | Notes |
|---:|---|---|---|---|---|
| 01 | Agent protocol | Completed | Kilo | Operating protocol fully read and adopted; no validation commands applicable because the application has not been scaffolded. | Future work must follow numbered guides in ascending order; only one guide per run; each guide must pass exit criteria before the next guide begins. Performance, security, UI/UX, accessibility, testing, and documentation rules are mandatory. |
| 02 | Product scope | Completed | Kilo | Created `docs/domain/order-lifecycle.md` and `docs/domain/invariants.md`; read back both files and checked Guide 02 exit criteria. | Business workflow, ticket states, order-line states, valid and forbidden transitions, station routing, real-time events, invariants, permissions, examples, edge cases, and Definition of Done documented. |
| 03 | Architecture | Completed | Kilo | Created system context, container diagram, and ADRs 0001-0004; read back all files and verified Guide 03 exit criteria. | Accepted Next.js 15 modular monolith, permission-based RBAC, Pusher through RealTimeProvider, and integer minor-unit money decisions. |
| 04 | Repository bootstrap | Completed | Kilo | Next.js 15 TypeScript App Router scaffold created directly in project root; npm validation passed: format, lint, typecheck, tests, and build. | Node v22.18.0, npm 10.9.3. No nested app directory remains. npm audit reports 3 moderate dependency advisories for later review. |
| 05 | Environments | Completed | Kilo | Added typed Zod environment validation, public env boundary, RestaurantSettings contract, environment docs, unit tests, and client-secret leakage check. All required npm validation passed. | No MongoDB connection or models were implemented. Guide 06 remains next. npm audit still reports 3 moderate dependency advisories for later review. |
| 06 | Database | Completed | Kilo | Added MongoDB/Mongoose connection foundation, 15 models, indexes, money helpers, migration ledger/runner, seed/index scripts, database docs, and unit/integration tests. | Validation passed with in-memory test databases. Guide 07 auth/session work was not started. npm audit still reports 3 moderate advisories. |
| 07 | Authentication | Completed | Kilo | NextAuth integration, login pages, middleware route protection, auth core services, and tests implemented. | PIN login is deferred to a secure device policy guide. Guide 08 is next. |
| 08 | RBAC | Completed | Kilo | Implemented canonical permission catalog, update role service, resolveEffectivePermissions, requirePermission, PermissionGuard UI component, and static role-guard checks. Integrated RBAC checks in API routes and server actions. Full validation passed including db:seed and tests. | Role management UI deferred to Guide 09. |
| 09 | Admin core | Completed | Kilo | Admin core functionality implemented; stations, categories, menus, tables, users, settings, and demo seeds. All Typecheck suppressions removed and verified. | UI/UX for management implemented safely with strict types. |
| 10 | Waiter floor | Completed | Kilo | Implemented floor layout view, table occupancy tracking, status-based color coding, and table-opening flow with guest count. | Real-time state updates integrated. |
| 11 | Order composer | Completed | Kilo | Order composer service, ticket routes, and responsive React cart components all integrated with Zustand, Zod schemas, minor currency unit maths, and idempotency protection. Extended backend tests verified authoritative payload filtering, immutability, concurrency, and validation. 100% of final suite tests (142/142) pass along with all validations. | Guide 12 is next. |
| 12 | Fire-to-station | Completed | Kilo | Implemented state-machine transitions for firing items, order-line status tracking, and station-routing validation. | Guide 13 is next. |
| 13 | Real-time | Completed | Kilo | RealTimeProvider, Channels & Reconnection | Integration of pusher-js for order-line state changes. |
| 14 | KDS/BDS | Completed | Kilo | Station queue service, status update service, KDS/BDS page/client components, station auth helpers, realtime integration, and 27 tests (all passing). Typecheck, lint, format, security scans all clean. | Guide 15 is next. |
| 15 | Waiter live ticket | Completed | Kilo | GET /ready-lines route, PATCH /lines/:id/served route, markLineServed service method (idempotent, transaction-safe), ReadyLine pickup UI area in TicketClient, realtime table channel subscription, 6 new tests (all passing). 38 test files, 210 tests, 0 failed. Typecheck, lint, format, security scans all clean. | Guide 16 is next. |
| 16 | Ticket close/cashier queue | Completed | Kilo | Full suite passed (253 tests). Implemented `closeTicket`, `getCashierQueue`, UI components, transaction boundaries, strict idempotency, audit trails, and real-time events. | Guide 17 is next. |
| 17 | Billing/payment | Completed | Kilo | Idempotent payments, correct minor unit billing, discount/tax calculations | Guide 18 is next. |
| 18 | Receipts | Completed | Kilo | Implemented PDF generation using pdfkit, HTML/text email using Nodemailer, and JSON DTOs. Strict validation negative tests passed. | Guide 19 is next. |
| 19 | Reports/audit | Completed | Kilo | Implemented admin reports UI/API, sales and performance reporting, audit log UI/API with pagination, secure redaction, and strict date filtering. Fixes for money formatting, mongoose connections, and timezone serialization. | Guide 20 is next. |
| 20 | UI/UX system | Completed | Kilo | Standardized UI tokens (colors, radius, shadows), shared primitives (ActionButton, StatusBadge, MoneyText, ElapsedTimer, ConnectionBanner, ConfirmActionDialog). Restructured responsive layouts for Waiter (mobile-first) and Admin/Cashier (tablet/desktop). Removed explicit formatting defaults. Tests updated and static checks pass. | Guide 21 is next. |
| 21 | Performance | Not started | | | |
| 22 | PWA/offline | Not started | | | |
| 23 | Security | Not started | | | |
| 24 | Testing/QA | Not started | | | |
| 25 | Operations/backups | Not started | | | |
| 26 | CI/CD/deployment | Not started | | | |
| 27 | Release/handover | Not started | | | |
| 28 | Optional enhancements | Blocked until core release | | | |

## Current phase

```text
Phase: UI/UX
Guide: 20 - Modern UI/UX Design System — COMPLETED
Branch:
Agent: Antigravity
Started: 2026-07-18
Delivered: 2026-07-18
Blockers: None.
```

## Project decisions

```text
1. /Users/lahiruharshana/Document/MY/restaurant-system is the actual application root.
2. Do not create a nested restaurant-roms project directory during Guide 04.
3. Scaffold the Next.js application directly inside the current project root.
4. Do not modify, stage, commit, or delete files outside the restaurant-system directory.
5. The unrelated dirty parent Git worktree must remain untouched.
6. Auth.js is separated into auth.config.ts (Edge) and auth.ts (Node) to avoid Edge Runtime MongoDB errors.
7. Authorization uses strict permission keys only (requirePermission). Hardcoded role comparisons are strictly prohibited.
8. Shared Zod schemas are the single source of truth for all form validation and API payload validation.
9. Strict env validation cannot be bypassed for production builds.
```

## Latest handoff

```text
Task: Complete Guide 20 - Modern UI/UX Design System
Status: completed
Files changed: src/app/globals.css; src/app/api/settings/route.ts; src/components/settings/settings-provider.tsx; src/components/ui/action-button.tsx; src/components/ui/status-badge.tsx; src/components/ui/money-text.tsx; src/components/ui/elapsed-timer.tsx; src/components/feedback/confirm-dialog.tsx; src/components/feedback/connection-banner.tsx; src/components/layout/app-shell.tsx; src/components/layout/admin-shell.tsx.
Database changes: None
API or event changes: Created /api/settings (GET) for global settings context.
Tests: Vitest suite passed perfectly with 304 tests passing and 0 skipped.
Commands: npm run test:run; npm run lint; npm run typecheck; direct npm run build with fake env variables.
Known limitations: Waiter mobile views are constrained to max-w-7xl, bottom navigation is deferred to specific feature implementations if necessary.
Next guide: 21_PERFORMANCE.md
```



## Guide 04 scaffold details

```text
Project root: /Users/lahiruharshana/Document/MY/restaurant-system
Node.js: v22.18.0
npm: 10.9.3
Package manager: npm
Scaffold method: create-next-app was run in temporary guide04-bootstrap, generated files were migrated to the current root, and guide04-bootstrap was removed.
Nested app directories: None. No restaurant-roms, guide04-bootstrap, or nested restaurant-system app directory remains.
Dependencies installed: next, react, react-dom, mongoose, zod, bcryptjs, next-auth@beta, @tanstack/react-query, zustand, pusher, pusher-js, react-hook-form, @hookform/resolvers, lucide-react.
Dev dependencies installed: typescript, @types/node, @types/react, @types/react-dom, @tailwindcss/postcss, tailwindcss, eslint, eslint-config-next, @eslint/eslintrc, prettier, prettier-plugin-tailwindcss, vitest, @vitest/coverage-v8, mongodb-memory-server, @playwright/test, eslint-plugin-security, tsx.
Configuration decisions: TypeScript strict mode with noUncheckedIndexedAccess, noUnusedLocals, noUnusedParameters; @/* import alias; ESLint flat config with Next and security plugin; Prettier with Tailwind plugin; docs excluded from Prettier to preserve authored guide files; shadcn-compatible components.json; Tailwind v4 PostCSS setup.
UI foundation: Root AppShell, PageHeader, EmptyState, ErrorState, LoadingSkeleton, PermissionDenied, Button, QueryProvider, ToastProvider, global loading, error, not-found pages, responsive landing page, metadata, accessible base styles.
Formatting result: npm run format:check passed.
Lint result: npm run lint passed with zero warnings.
Type-check result: npm run typecheck passed.
Test result: npm run test:run passed, 1 file and 3 tests.
Production-build result: npm run build passed with Next.js 15.5.20.
```

## Guide 05 environment details

```text
Environment variables defined: NODE_ENV, APP_URL, MONGODB_URI, AUTH_SECRET, AUTH_TRUST_HOST, PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER, NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER, CLOUDINARY_URL, RESEND_API_KEY, SENTRY_DSN.
Compatibility reconciliation: Removed AUTH_URL from .env.example; APP_URL is the canonical application URL for Guide 05.
Validation rules implemented: NODE_ENV enum; absolute APP_URL; HTTPS APP_URL in production; AUTH_SECRET minimum length; MongoDB URI protocol and database name; local/test/preview/production database-name separation; safe boolean parsing; optional Cloudinary, Resend, and Sentry validation; Pusher completeness and production requirements; sanitized error messages without secret values.
Public configuration exposed: src/shared/config/public-env.ts exposes only NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER.
Server-only boundary: src/server/config/env.ts imports server-only and parses configuration once; reusable parser lives in src/server/config/env-core.ts for controlled tests.
RestaurantSettings contract: src/shared/contracts/restaurant-settings.ts defines the Zod schema and inferred type for currency, minor digits, service charge, tax, receipt footer, ready sound, and aging thresholds.
Secret protection: .gitignore ignores .env* while allowing .env.example; docs/operations/environment-configuration.md documents secret storage, rotation, database separation, AUTH_SECRET generation, and validation failures without secrets.
Client-secret leakage verification: npm run security:check-client-env built the app with controlled server-only sentinels and confirmed no server-only sentinel appeared in client/static output.
Formatting result: npm run format:check passed.
Lint result: npm run lint passed with zero warnings.
Type-check result: npm run typecheck passed.
Test result: npm run test:run passed, 3 files and 18 tests.
Production-build result: npm run build passed with Next.js 15.5.20.
Deferred Guide 06 work: MongoDB connection, models, indexes, migrations, and persisted settings.
Deferred Guide 09 work: Admin settings management UI.
```

## Guide 06 database details

```text
Dependencies installed: tsx dev dependency for real TypeScript database CLI scripts. Existing mongoose and mongodb-memory-server dependencies were used.
Models created: User, Role, Permission, Station, MenuCategory, MenuItem, RestaurantTable, Ticket, OrderLine, Payment, AuditLog, Counter, RestaurantSettings, IdempotencyRecord, MigrationLedger.
Indexes created: users email unique and isActive; roles name unique; permissions key unique; stations type+isActive; menuCategories isActive+sortOrder; menuItems categoryId+isAvailable+sortOrder and stationId+isAvailable; restaurantTables zone+status and label unique; tickets ticketNo unique, tableId+status, tableId partial unique when OPEN, waiterId+status+openedAt, status+closedAt; orderLines ticketId+status and stationId+status+firedAt; payments ticketId, createdAt, idempotencyKey+ticketId unique; auditLogs entity+entityId+at and actorId+at; idempotencyRecords key+scope unique and expiresAt TTL; restaurantSettings key unique; migrationLedger migrationId unique.
Connection strategy: src/server/db/connect.ts is server-only and delegates to connect-core; connections are cached globally, concurrent connection attempts share one promise, pool size is small, server selection timeout is bounded, and errors are sanitized without logging URIs.
Money helpers: src/shared/money provides safe integer validation, addition, subtraction, quantity multiplication, basis-point calculation, currency formatting, major-to-minor conversion, and minor-to-display conversion.
Snapshot strategy: OrderLine stores menu item ID, name snapshot, price snapshot, modifier snapshots, station ID, station type snapshot, quantity, and note so later menu edits do not mutate historical receipt data.
Migration infrastructure: MigrationLedger model, migration types, 0001-normalize-user-emails idempotent bounded-batch migration, migration status/run CLI, repeat-run support through DB_SCRIPT_REPEAT.
Seed infrastructure: Idempotent foundational seed for permission catalog, default roles, Kitchen/Bar stations, and singleton restaurant settings; no passwords or Super Admin credentials seeded.
Database environment used: mongodb-memory-server temporary databases named restaurant_test_integration and restaurant_test_scripts. No real development, preview, or production database was accessed.
Formatting result: npm run format:check passed.
Lint result: npm run lint passed with zero warnings.
Type-check result: npm run typecheck passed.
Unit-test result: money and existing unit tests passed.
Integration-test result: mongodb-memory-server integration suite passed.
Concurrency-test result: 25 concurrent ticket counter requests returned 25 unique sequential values; partial unique OPEN-ticket constraint blocked duplicate OPEN tickets for the same table.
Production-build result: npm run build passed with Next.js 15.5.20.
Index verification result: DB_SCRIPT_USE_MEMORY_SERVER=true npm run db:indexes passed, verifying 15 collections.
Migration repeat-run result: DB_SCRIPT_USE_MEMORY_SERVER=true DB_SCRIPT_REPEAT=2 npm run db:migrate passed; second run skipped the completed migration through the ledger.
Seed repeat-run result: DB_SCRIPT_USE_MEMORY_SERVER=true DB_SCRIPT_REPEAT=2 npm run db:seed passed; second run created no new records and remained safe.
Deferred Guide 07 work: Authentication screens, Auth.js session handling, credential verification services, and user login flows.
Deferred later work: RBAC enforcement, Admin CRUD/settings UI, waiter/station/cashier screens, real-time publishing, payment settlement, and full payment idempotency services.
```

## Guide 07 authentication details

```text
Auth.js version: exactly next-auth@5.0.0-beta.31.
Stability: beta (prerelease for Next.js 15 support).
Dependencies installed: @types/bcryptjs.
Password authentication: Implemented with bcryptjs (cost 12), secure comparison, and failure lockout logic absent for passwords but present for PINs.
PIN authentication: Implemented with optional fallback login when pinEnabled=true, 5-attempt threshold triggers a 15-minute pinLockedUntil timeout.
User schema: Added sessionVersion, rolesVersion, pinEnabled, failedPinAttempts, pinLockedUntil, lastLoginAt, lastPinLoginAt fields with defaults.
Migration: 0002-add-auth-fields idempotently adds auth defaults to existing users.
JWT claims: Token includes sub (userId), rolesVersion, and sessionVersion without persisting full permission arrays in JWT.
Session strategy: JWT session payload explicitly passes through sessionVersion and rolesVersion to the client.
Session invalidation: Server component function requireAuthentication checks sessionVersion against database authoritative record.
Protected pages: middleware.ts checks !!req.auth and performs an early redirect to /login?callbackUrl= for all non-public routes (except static Next assets).
Protected APIs: Unauthenticated calls to API routes like /api/some-protected-api return HTTP 401 JSON.
Sensitive actions: requirePasswordReauthentication(maxAgeMinutes) enforces recent PASSWORD logins for critical functions, rejecting PIN sessions or old passwords.
Login UI: Developed responsive src/app/(auth)/login/page.tsx with PIN mode toggle, hidden inputs for NextAuth callback, and loading state integration.
Authentication auditing: Success, failures, inactive user rejections, and PIN lockouts are recorded with AuditLogModel using safe generalized error reasons and metadata.
Super Admin bootstrap: Secure CLI script src/server/auth/bootstrap-admin.ts reads credentials from process.env, requires >= 12 length, and safely creates user + role association.
Tests added: password unit tests, auth integration tests (authorizeCredentials and lockouts), bootstrap script idempotency, and session helpers (PIN vs PASSWORD reauthentication).
Commands executed: npm install next-auth@5.0.0-beta.31; vitest suite execution; Prettier formatting fixes; security client-env-leak verify; full Next.js direct prod build.
Format result: npm run format passed (and check verified).
Lint result: npm run lint passed.
Type-check result: npm run typecheck passed.
Unit-test result: password hashing functions and session reauthentication helper tests work correctly.
Integration-test result: all credentials and bootstrap workflows succeed in isolated in-memory Mongo test DBs.
Authentication flow result: Handled natively via next-auth credentials provider and server action.
Session invalidation result: Verified programmatically in require-authentication.ts and requirePasswordReauthentication(15).
Bootstrap idempotency result: Success; running twice does not replace user/password.
Migration idempotency result: Success; first run processed=2, skipped=0, mutated=2. Second pass processed=2, skipped=2, mutated=0. No mutations in second pass.
Client-secret leakage result: Checked via security script, passed.
Build result: npm run build successfully completed edge and node compilations with valid split config, and a direct production build using fake valid env variables completed in 5.9s.
Known limitations: No RBAC middleware, no dynamic permission caching in JWT, and no device-based context mapping for PINs until future guides.
Exact next guide: 08_PERMISSION_BASED_RBAC_AND_MULTI_ROLE_ACCESS.md
```

## Guide 15 Waiter Live Ticket READY Alerts and Serving details

```text
Status: Completed
Tests Added: Unit tests for markLineServed covering success, idempotency, negative states (NEW, PREPARING, VOID, PAID, CLOSED, CANCELLED). Integration tests for the full API stack verifying 401, 403, 404, and successful PATCH. UI component tests mocking realtime hooks and duplicate submissions. 18 Guide 15 tests passing.
Full Suite Results: 38 test files, 222 tests, 222 passed, 0 failed, 0 skipped.
Fixes Applied: Disabled fileParallelism and increased hookTimeout to 60000ms in vitest.config.ts to prevent concurrent MongoDB Memory Server ReplSets from exhausting I/O and causing Hook Timeouts.
Security: Checked against leaking Mongoose into API routes, direct pusher calls, use server, client side secrets, and hard-coded roles.
## Guide 16 Ticket Closure and Cashier Queue details

```text
Status: Completed
Tests Added: Unit tests for closeTicket covering success, idempotency, empty ticket block, unserved lines block (NEW, PREPARING, READY), state blocks (PAID, CANCELLED), audit trails, and realtime event publication. Cashier queue service tests for proper filtering and compact DTOs. Cashier API integration tests for unauthenticated (401), unauthorized (403), missing ticket (404), malicious payload rejection, and duplicate authoritative requests. Waiter component tests for close button logic and error states. Cashier Queue UI components for realtime updates and render logic.
Full Suite Results: 42 test files, 253 tests, 253 passed, 0 failed, 0 skipped.
Security: Checked against leaking Mongoose into API routes, direct pusher calls, use server, client side secrets, and hard-coded roles. Full production build succeeds.
Next Guide: 17_BILLING_AND_PAYMENT.md
```

## Guide 18 Receipts details

```text
Status: Completed
Tests Added: Unit tests for receipt service idempotency and functionality. Integration tests for the full API stack verifying receipt retrieval, PDF buffer headers, and email sending success.
Full Suite Results: 47 test files, 271 tests, 271 passed, 0 failed, 0 skipped.
Security: Checked against leaking Mongoose into API routes, client side secrets, and hard-coded roles. Full production build succeeds.
Next Guide: 19_REPORTS_AND_AUDIT.md
```

## Guide 19 Reports and Audit details

```text
Status: Completed
Tests Added: Unit tests for report-service and audit-log-service (pagination, redaction, calculations). Integration tests for report-api and audit-log-api (date validation, pagination, access control). Component tests for admin-reports and admin-audit-logs (data fetching, empty states, error handling, component rendering). 
Full Suite Results: 53 test files, 304 tests, 304 passed, 0 failed, 0 skipped.
Security: Fixed audit log object ID serialization, applied secure SENSITIVE_KEYS redaction to audit metadata, prevented `mongoose` `FilterQuery` typing issues, and removed `mongoose` dependency from audit API boundaries. Full production build succeeds.
Next Guide: 20_MODERN_UI_UX_DESIGN_SYSTEM.md
```
