# Receipt Printing, PDF, and Email Operations

This document outlines the receipt generation, PDF compilation, and email delivery workflows implemented for the restaurant order management system.

## Overview

The Receipt Service (`src/server/cashier/receipt-service.ts`) provides a unified interface for transforming a closed ticket into a comprehensive, customer-facing receipt. It handles three core responsibilities:
1.  **JSON DTO Generation:** Standardizing ticket data, calculated totals, and configured settings into a `ReceiptDTO`.
2.  **PDF Generation:** Compiling a strict, tabular PDF receipt using `pdfkit`.
3.  **Email Delivery:** Formatting an HTML/Text receipt and dispatching it using Nodemailer.

## Prerequisites & Dependencies

*   **PDFKit:** Used to generate precise, layout-driven PDF documents directly in Node.js.
*   **Nodemailer:** Used to send emails via standard SMTP configuration.

## Environment Variables

The following environment variables control email functionality:

```env
# Optional. Controls Nodemailer SMTP connection.
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=user@example.com
EMAIL_PASS=secretpassword
EMAIL_FROM="Restaurant ROMS <noreply@restaurant.com>"
```

If these are not provided, email sending gracefully skips operations or logs warnings (depending on implementation), allowing the app to run without email in dev environments.

## API Endpoints

All endpoints require the `receipt:print` permission.

*   `GET /api/cashier/tickets/:id/receipt`: Returns the JSON `ReceiptDTO`.
*   `GET /api/cashier/tickets/:id/receipt/pdf`: Returns the generated PDF buffer with appropriate `Content-Type` (`application/pdf`) and `Content-Disposition` headers for download.
*   `POST /api/cashier/tickets/:id/receipt/email`: Triggers the email delivery. Accepts a JSON payload containing the target `{ email: "customer@example.com" }`.

## Receipt Generation Logic

### DTO Standardization
The service extracts order lines, groups them (optional based on future needs, but currently lists sequentially), appends any applied discounts, tax elements from `RestaurantSettings`, and standardizes minor integer units into display units (e.g. `$10.50`). 

### PDF Compilation
The PDF layout uses a monospace or simple sans-serif font provided by `pdfkit`. It includes:
*   Header (Restaurant Name, Date, Ticket No)
*   Itemized List (Qty, Item Name, Price)
*   Totals Block (Subtotal, Discount, Tax, Total, Tendered, Change)
*   Footer (Configured from Settings)

### Email Formatting
Nodemailer dispatches a multipart message containing:
*   **Text Part:** A plain-text fallback representation of the receipt.
*   **HTML Part:** A styled, responsive HTML table representation.

## Idempotency and Audit
While PDF/JSON generation is read-only, Email dispatching leverages `IdempotencyRecord` to prevent sending multiple emails for the same ticket/email-address pair within a short time window. The action is also logged in `AuditLog`.

## Security & Data Safety
*   **Raw Document Protection:** Raw Mongoose documents are never exposed in the DTO.
*   **Role/Permission Guards:** Handled via the central `requirePermission("receipt:print")` helper.
*   **PII & Secrets:** No payment secrets or system secrets are included in the receipt payload.
