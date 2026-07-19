# Modern UI/UX Design System

## Overview
This document outlines the design system, shared UI primitives, and layout strategies implemented during Guide 20. The system provides a standardized, accessible, and responsive foundation for the Restaurant Order Management System.

## Design Tokens
- **Semantic Colors**: `success`, `warning`, `danger`, and `info` colors (with foreground variants) are standardized in `src/app/globals.css`.
- **Integration**: These variables are injected into the Tailwind theme, enabling consistent usage (e.g., `bg-success`, `text-danger`) across all modes (light/dark).

## Shared UI Primitives
Standardized components are located in `src/components/ui` and `src/components/feedback`:
- **`ActionButton`**: Replaces the standard Button for mutating actions. Automatically handles loading states (disables the button and shows a spinner) and success states without manual boilerplate.
- **`StatusBadge`**: A unified badge component that visually maps ticket, table, and order-line statuses (e.g., `PAID` -> success, `CANCELLED` -> destructive).
- **`ElapsedTimer`**: A lightweight client-side timer (useful for Kitchen/Bar views) that changes color to warning and danger thresholds as time progresses.
- **`ConfirmActionDialog`**: A standardized alert dialog for dangerous or irreversible actions.
- **`ConnectionBanner`**: A globally available offline indicator that displays a non-intrusive warning when the browser loses network connectivity.

## SettingsProvider and Currency Formatting Policy
- **Policy**: Hardcoded currency symbols (like `$`) and fixed minor unit calculations are prohibited.
- **SettingsProvider**: Wraps the application and fetches the global `RestaurantSettings` via `/api/settings`. Uses `@tanstack/react-query` to cache settings.
- **Currency/Money Formatting**: All client-side money formatting must utilize the `useMoney` hook and `<MoneyText>` component. These primitives read the currency code, minor digits, and formatting rules directly from the `SettingsProvider` context.

## Responsive Strategy
- **Mobile-First**: Waiter interfaces are designed mobile-first to ensure usability on handheld devices.
- **Constraint**: Layouts are constrained by `max-w-7xl` through the central layout shells to prevent excessive stretching on ultra-wide displays while avoiding horizontal scrolling on mobile.

## Accessibility Strategy
- **Keyboard Navigation**: All interactive elements (buttons, forms, dialogs) remain fully keyboard navigable.
- **ARIA Attributes**: Proper ARIA roles are maintained (e.g., `aria-hidden` on SVG spinners, `aria-invalid` on form errors) to support screen readers.
- **Color Contrast**: Design tokens were selected to maintain safe color contrast ratios in both light and dark modes.

## Loading, Empty, and Error State Pattern
- **Centralized States**: Uses standard `<LoadingSkeleton>`, `<EmptyState>`, and `<ErrorState>` components.
- **Data Fetching**: Loading states are bound to React Query's `isLoading`/`isPending` properties, showing skeletons before content paints. 
- **Graceful Failures**: API failures gracefully fall back to the generic `ErrorState` rather than crashing the component tree.

## Layout Changes
- **Admin Layout**: Refined `AdminShell` to respect the `max-w-7xl` constraint and smoothly integrate the new `ConnectionBanner`.
- **Waiter Layout**: The Waiter interfaces (Floor, Composer, Ticket) naturally adapt to the `AppShell` constraints. Components were updated to use the new `ActionButton` and `StatusBadge` for better visual consistency.
- **Cashier Layout**: Shifted to the updated `AppShell` with responsive adjustments suited for tablet and desktop environments typical of POS terminals.

## Feature-Specific UI Changes
- **Reports/Audit UI**: Migrated all raw currency formatting (previously defaulting to USD) to the new `<MoneyText>` component. Data displays respect the global settings.
- **Billing/Receipt UI**: Replaced custom state badges with the standardized `<StatusBadge>`. Payment and discount actions now utilize `<ActionButton>`.

## Validation Summary
- **Static Scans**: Zero suppressions, explicit `any` usages, client/server boundary violations, or raw Mongoose queries in API routes.
- **Test Suite**: A full integration and unit test suite comprising 310 tests across 54 files passes with 0 failures and 0 skipped.
- **Builds**: The Next.js production build (`npm run build`) completes successfully with full strict static generation.

## Remaining Limitations
- Waiter mobile views are constrained properly but currently lack a dedicated "Bottom Navigation" bar. This enhancement is deferred to specific feature requirements or native app wrappers.
- Reporting UI remains read-only; CSV/Excel exports are deferred to a later enhancement phase.

## Guide 21 Status
- **Performance (Guide 21)**: Not started. No files or implementations related to Guide 21 have been created or modified.
