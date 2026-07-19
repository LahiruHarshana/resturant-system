# Restaurant Order Management System

Foundation application for the Restaurant Order Management System described in `docs/ai-agent-guides/`.

## Stack

- Next.js 15 App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui-compatible component structure
- Vitest test foundation
- MongoDB, Auth.js, Pusher, Cloudinary, Resend, and Sentry dependencies for later guides

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## Implementation Rules

- Follow the numbered guides in `docs/ai-agent-guides/` in ascending order.
- Do not hard-code role checks. Use permission-based authorization.
- Keep UI, route handlers, domain services, data access, real-time, and audit boundaries separate.
- Store money in integer minor units.
- Treat database state as authoritative; real-time events are notifications only.

## Project Root

The application is scaffolded directly in this project root. Do not create a nested `restaurant-roms` application directory.
