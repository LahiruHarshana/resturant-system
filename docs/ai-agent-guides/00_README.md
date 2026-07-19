---
title: Restaurant Order Management System - AI Agent Implementation Guides
order: 0
status: ready
source: Restaurant_System_Plan.docx
---

# Restaurant Order Management System

This folder converts the complete planning document into an ordered, implementation-ready set of Markdown guides. The guides are written for software engineers and AI coding agents. Follow them in numeric order. Do not skip a gate unless the dependency is already complete and verified.

## Primary outcome

Build a fast, modern, mobile-first Restaurant Order Management System with:

- Waiter table ordering from a phone or installable PWA.
- Automatic Kitchen and Bar routing at order-line level.
- Real-time Kitchen Display System and Bar Display System updates.
- Live READY notifications to the responsible waiter.
- Additional rounds on the same open ticket.
- Ticket closure, cashier settlement, payment, and receipt generation.
- Flexible permission-based access control with multiple roles per user.
- Admin management for users, roles, stations, menu, tables, reports, and audit logs.

## Recommended implementation baseline

- Next.js 15 App Router and TypeScript.
- MongoDB Atlas Free cluster and Mongoose.
- Auth.js credentials authentication with JWT sessions.
- Tailwind CSS, shadcn/ui, and Lucide icons.
- TanStack Query for server state and Zustand only for small transient client state.
- Zod schemas shared between UI and server.
- Pusher private channels for the simplest serverless real-time deployment, with an adapter that can later support Socket.IO.
- Vercel for the web application and MongoDB Atlas for data.

## Important modernizations applied by these guides

The source plan is preserved, but these implementation improvements are mandatory:

1. Store money in integer minor units, never floating-point numbers.
2. Store `pinHash`, never a plaintext PIN.
3. Use idempotency keys for payment and order-line submission.
4. Use database indexes and projection-first queries from the beginning.
5. Use atomic ticket and table operations to prevent duplicate open tickets.
6. Use small real-time events and re-fetch authoritative state after reconnect.
7. Treat performance and UX as acceptance criteria, not later polish.
8. Do not assume managed backups exist on a free database tier; run verified exports.

## Guide order

| Range | Purpose |
|---|---|
| 01-05 | Agent rules, scope, architecture, repository, and environments |
| 06-09 | Database, authentication, authorization, and admin core |
| 10-15 | Waiter ordering, station routing, real-time, KDS/BDS, and live ticket |
| 16-19 | Cashier, payments, receipts, reports, and audit |
| 20-23 | Modern UI/UX, speed, PWA reliability, and security |
| 24-27 | Testing, operations, deployment, acceptance, and release |
| 28-31 | Enhancements, contracts, reusable agent prompts, and progress tracking |

## Non-negotiable product targets

- A trained waiter must be able to open a table and fire an order in under 15 seconds.
- Every primary waiter action must be reachable within two taps from its immediate context.
- Status mutations must feel immediate through optimistic UI, while the server remains authoritative.
- A Kitchen user must never see or update Bar-only lines unless explicitly granted permission.
- A multi-role user must receive the union of all assigned role permissions.
- Closing a ticket must block new items and add it to the cashier queue.
- Payment must be idempotent, free the table exactly once, and produce a correct receipt.

## How an AI agent must use these files

1. Read `01_AI_AGENT_OPERATING_PROTOCOL.md` first.
2. Read the current phase guide and all declared dependencies.
3. Inspect the existing repository before creating or replacing files.
4. Implement only the requested phase.
5. Run the exact validation commands described by the guide.
6. Update `31_PROGRESS_TRACKER.md` and provide a handoff summary.

## Completion rule

The project is not complete when screens merely render. It is complete only when the acceptance scenarios in `27_RELEASE_ACCEPTANCE_AND_HANDOVER.md` pass on real mobile, kitchen, cashier, and admin devices.
