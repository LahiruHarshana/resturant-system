---
title: Billing, Discounts, Tax, Payments, and Idempotency
order: 17
phase: cashier
status: not-started
---

# Billing, Discounts, Tax, Payments, and Idempotency

## Objective

Settle tickets accurately and exactly once.

## Billing rules

Calculate in this explicit order and document the restaurant policy:

1. Sum non-VOID order-line totals.
2. Apply approved discount.
3. Apply service charge.
4. Apply tax.
5. Produce final total.

Use basis points for percentage configuration and integer minor units for all values. Define rounding in one shared function.

## Discount model

Support a controlled first release:

- Fixed amount.
- Percentage with maximum optional cap.
- Required reason.
- Permission threshold for large discounts.

Do not allow arbitrary client-calculated totals.

## Payment request

```ts
{
  idempotencyKey,
  method: 'cash' | 'card' | 'other',
  tenderedMinor,
  discount,
  serviceCharge,
  tax
}
```

## Settle-ticket service

1. Require `payment:create`.
2. Resolve the idempotency key.
3. Load CLOSED ticket and line snapshots.
4. Recalculate the bill on the server.
5. Validate tendered amount for cash.
6. Create payment record.
7. Change ticket to PAID and set `paidAt`.
8. Free the table and clear `currentTicketId`.
9. Write audit log.
10. Store the idempotent result.
11. Publish `ticket.paid.v1`.
12. Return payment and receipt data.

Use a transaction when available. Retain unique or logical guards that prevent two payments even if retries occur.

## Cash UX

- Large numeric keypad on touch devices.
- Quick tender buttons.
- Automatic change calculation.
- Clear total, tendered, and change hierarchy.
- Confirm before final settlement.
- Disable the final button during submission.
- On timeout, query payment status before allowing retry.

## Tests

- Correct rounding.
- Fixed and percentage discounts.
- Double-click does not create two payments.
- Network retry with same key returns same result.
- Simultaneous cashier attempts settle once.
- PAID ticket frees table exactly once.

## Exit gate

Financial calculations are deterministic, fully tested, and impossible to settle twice through normal or retried requests.
