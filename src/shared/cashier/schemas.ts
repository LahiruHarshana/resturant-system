import { z } from "zod";

export const CashierQueueTicketSchema = z.object({
  id: z.string(),
  ticketNo: z.number(),
  tableId: z.string(),
  tableLabel: z.string(),
  waiterId: z.string(),
  waiterName: z.string(),
  status: z.enum(["CLOSED"]),
  guestCount: z.number(),
  closedAt: z.string().datetime(),
  subtotalMinor: z.number().int().nonnegative(),
  taxMinor: z.number().int().nonnegative(),
  serviceChargeMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  lineSummary: z.array(
    z.object({
      quantity: z.number().int().positive(),
      nameSnapshot: z.string(),
    }),
  ),
});

export type CashierQueueTicketDTO = z.infer<typeof CashierQueueTicketSchema>;

export const CashierQueueResponseSchema = z.object({
  tickets: z.array(CashierQueueTicketSchema),
});

export type CashierQueueResponse = z.infer<typeof CashierQueueResponseSchema>;

export const BillLineItemSchema = z.object({
  id: z.string(),
  nameSnapshot: z.string(),
  quantity: z.number().int().positive(),
  priceSnapshotMinor: z.number().int().nonnegative(),
  modifiersMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
});

export const BillResponseSchema = z.object({
  id: z.string(),
  ticketNo: z.number(),
  tableId: z.string(),
  waiterId: z.string(),
  status: z.enum(["OPEN", "CLOSED", "PAID", "CANCELLED"]),
  subtotalMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative(),
  taxMinor: z.number().int().nonnegative(),
  serviceChargeMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  lines: z.array(BillLineItemSchema),
});

export type BillResponseDTO = z.infer<typeof BillResponseSchema>;

export const ApplyDiscountRequestSchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
});

export type ApplyDiscountRequestDTO = z.infer<
  typeof ApplyDiscountRequestSchema
>;

export const RecordPaymentRequestSchema = z.object({
  method: z.enum(["CASH", "CARD", "OTHER"]),
  tenderedMinor: z.number().int().nonnegative(),
  idempotencyKey: z.string().uuid(),
});

export type RecordPaymentRequestDTO = z.infer<
  typeof RecordPaymentRequestSchema
>;

export const ReceiptLineItemSchema = z.object({
  quantity: z.number().int().positive(),
  nameSnapshot: z.string(),
  totalMinor: z.number().int().nonnegative(),
});

export const ReceiptSchema = z.object({
  id: z.string(),
  ticketNo: z.number(),
  restaurantName: z.string(),
  restaurantAddress: z.string().optional(),
  restaurantPhone: z.string().optional(),
  restaurantEmail: z.union([z.string().email(), z.literal(""), z.undefined()]),
  tableLabel: z.string(),
  waiterName: z.string(),
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  lines: z.array(ReceiptLineItemSchema),
  subtotalMinor: z.number().int().nonnegative(),
  discountMinor: z.number().int().nonnegative(),
  taxMinor: z.number().int().nonnegative(),
  serviceChargeMinor: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  payment: z
    .object({
      method: z.string(),
      tenderedMinor: z.number().int().nonnegative(),
      changeMinor: z.number().int().nonnegative(),
      cashierName: z.string(),
    })
    .nullable(),
  footerText: z.string().optional(),
});

export type ReceiptDTO = z.infer<typeof ReceiptSchema>;

export const SendReceiptEmailRequestSchema = z.object({
  email: z.string().email(),
  idempotencyKey: z.string().uuid(),
});

export type SendReceiptEmailRequestDTO = z.infer<
  typeof SendReceiptEmailRequestSchema
>;
