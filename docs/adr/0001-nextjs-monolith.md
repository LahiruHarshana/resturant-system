# ADR 0001: Next.js 15 Modular Monolith

## Status

Accepted

## Context

The restaurant system must support waiter mobile ordering, Kitchen and Bar displays, cashier settlement, admin management, reports, audit logs, authentication, authorization, and real-time notifications. The initial deployment is for one restaurant and must be fast to build, maintainable, inexpensive to operate, and compatible with Vercel. The original specification recommends a full-stack monolith, and Guide 03 requires a Next.js 15 App Router architecture.

## Decision

Build the application as a full-stack modular monolith using Next.js 15 App Router and TypeScript. The application will be scaffolded directly in `/Users/lahiruharshana/Document/MY/restaurant-system` during Guide 04, preserving the existing `docs/` directory and avoiding a nested `restaurant-roms` directory.

The monolith will contain persona-specific UI, Route Handlers, server-side authentication and RBAC, domain services, data access, real-time provider adapters, shared contracts, shared money helpers, and typed errors in one repository.

## Alternatives Considered

| Alternative | Reason not selected |
|---|---|
| Separate frontend and backend repositories | Increases contract drift, deployment coordination, and maintenance overhead for the first release. |
| Microservices | Adds operational complexity without a current scaling need. |
| Native mobile applications | Slower to ship and maintain; waiter PWA satisfies initial mobile-first requirements. |
| Express or NestJS backend plus separate Next.js UI | More moving parts than necessary for one restaurant and duplicates deployment concerns. |

## Consequences

Positive:

- One TypeScript codebase reduces DTO and validation drift.
- Route Handlers provide a clear REST boundary for clients.
- Server Components can keep stable shells and reference data efficient.
- Persona route groups support role-aware code splitting.
- Vercel deployment is straightforward for the web application.

Negative:

- Careful boundaries are required to prevent UI from importing server-only modules.
- Vercel serverless functions are not suitable for native long-lived Socket.IO, requiring an external real-time provider for the initial deployment.
- Large features must be modularized inside the monolith to avoid accidental cross-persona bundle leakage.

## Security Impact

- Server-side Route Handlers and services enforce authentication, permission checks, validation, and audit logging.
- Secrets remain in server-only modules and environment variables.
- UI hiding is not a security boundary.
- Auth.js details must be wrapped by server auth helpers and not leaked into presentation components.

## Performance Impact

- Route groups can avoid loading admin/report code into waiter routes.
- Server Components can reduce unnecessary client-side JavaScript.
- API and service boundaries allow compact DTOs and hot-path optimization.
- Database access must remain server-side with projections, lean reads, indexes, and batching.

## Operational Impact

- One application deploys to Vercel with preview environments.
- CI can run lint, typecheck, tests, and build in one pipeline once the app is scaffolded.
- Operational runbooks can target one deployable application plus managed external services.

## Conditions To Revisit

Revisit this decision if:

- The system expands to multiple branches or tenants with independent scaling requirements.
- A dedicated always-on backend becomes necessary for high-volume real-time traffic.
- Background jobs, reporting, or integrations grow beyond what a modular monolith can safely isolate.
- Vercel constraints prevent required operational reliability even with provider abstractions.
