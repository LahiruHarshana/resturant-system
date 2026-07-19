---
title: Receipt Printing, PDF, and Email
order: 18
phase: cashier
status: not-started
---

# Receipt Printing, PDF, and Email

## Objective

Generate a stable receipt from ticket and payment snapshots without depending on current menu data.

## Receipt content

- Restaurant name and contact details.
- Ticket number.
- Table and waiter.
- Opened, closed, and paid timestamps.
- Item name snapshots, quantity, modifiers, and line totals.
- Subtotal, discount, service charge, tax, total.
- Payment method, tendered amount, and change when relevant.
- Cashier.
- Configurable footer.

## Data source

Build receipt data from:

- Ticket snapshot totals.
- Order-line snapshots.
- Payment record.
- Restaurant settings snapshot or versioned settings.

Never re-price using the current menu.

## Output modes

1. Browser print stylesheet for thermal or A4 printing.
2. Downloadable PDF.
3. Optional email receipt after payment.

## Print UX

- Open print view immediately after successful payment.
- Provide Print, Download PDF, and Done actions.
- Do not block payment success if email or PDF generation fails.
- Allow reprint only with `receipt:print` and audit repeated prints if required.

## Performance

- Generate the lightweight HTML receipt immediately.
- Create PDF on demand rather than during every payment unless operationally required.
- Keep logos optimized and embedded at an appropriate size.
- Avoid remote image dependencies in the printable output.

## Tests

- Receipt total matches payment total.
- Menu price changes do not alter an old receipt.
- VOID lines are excluded or clearly represented according to policy.
- Reprint works for PAID ticket.
- PDF failure does not reverse payment.

## Exit gate

The cashier can print or download a readable, accurate receipt immediately after payment and later reprint it from history.
