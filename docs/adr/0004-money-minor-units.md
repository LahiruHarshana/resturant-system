# ADR 0004: Integer Minor Units For Money

## Status

Accepted

## Context

The restaurant system calculates menu prices, modifier deltas, ticket subtotals, discounts, service charges, tax, tendered amounts, change, payments, and receipt totals. Floating-point arithmetic can create rounding errors in financial workflows. Guide 02 requires stable order-line snapshots and payment idempotency. The implementation guides require storing money in integer minor units.

## Decision

Store and calculate all monetary values as integer minor units. Examples include `priceMinor`, `subtotalMinor`, `discountMinor`, `serviceChargeMinor`, `taxMinor`, `totalMinor`, `tenderedMinor`, and `changeMinor`. Currency and minor digit configuration must come from restaurant settings, not hard-coded UI logic.

Order lines snapshot item names, prices, modifier labels, modifier price deltas, station IDs, and station types when fired. Receipts and historical reports use snapshots rather than current menu data.

## Alternatives Considered

| Alternative | Reason not selected |
|---|---|
| JavaScript floating-point numbers | Can produce rounding errors and inconsistent receipts. |
| Decimal strings everywhere | Avoids floating-point issues but complicates arithmetic and comparisons. |
| MongoDB Decimal128 for all money | More complex for shared TypeScript client/server helpers and still requires strict conversion rules. |
| Store display-formatted currency strings | Not suitable for arithmetic, sorting, or reporting. |

## Consequences

Positive:

- Deterministic totals and receipts.
- Safe arithmetic for discounts, tax, service charge, tendered amount, and change.
- Easier idempotency comparison for payment results.
- Historical receipts remain stable after menu price changes.

Negative:

- All UI forms must convert display currency to minor units before server validation or send structured display input for server conversion.
- Shared helpers are required for formatting and rounding.
- Restaurant settings must define currency and minor digits before production use.

## Security Impact

- The server must ignore client-submitted authoritative prices and totals.
- Payment and receipt totals must be calculated or validated server-side.
- No full payment card details are stored; payment metadata must remain safe and minimal.

## Performance Impact

- Integer arithmetic is fast and predictable.
- Storing snapshots reduces hot-path joins during receipts and reports.
- Reports can aggregate integer totals efficiently with MongoDB pipelines.

## Operational Impact

- Menu imports, admin price editing, receipts, reports, and payment settlement must all use the same money helpers.
- Currency changes after operations begin require a separate approved migration and operational policy.
- Rounding rules for percentage discounts, service charges, and tax must be documented and tested in later guides.

## Conditions To Revisit

Revisit this decision if:

- Multi-currency or multi-branch support is introduced.
- A payment provider requires a different canonical representation and conversion layer.
- Legal or accounting requirements require a specific decimal storage type.
- Currency minor digits need historical versioning per ticket or receipt.
