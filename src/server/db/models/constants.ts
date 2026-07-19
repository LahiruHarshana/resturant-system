export const TICKET_STATUSES = ["OPEN", "CLOSED", "PAID", "CANCELLED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const ORDER_LINE_STATUSES = [
  "NEW",
  "PREPARING",
  "READY",
  "SERVED",
  "VOID",
] as const;
export type OrderLineStatus = (typeof ORDER_LINE_STATUSES)[number];

export const STATION_TYPES = ["KITCHEN", "BAR", "CUSTOM"] as const;
export type StationType = (typeof STATION_TYPES)[number];

export const TABLE_STATUSES = [
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "INACTIVE",
] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export const PAYMENT_METHODS = ["CASH", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const IDEMPOTENCY_STATUSES = [
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
] as const;
export type IdempotencyStatus = (typeof IDEMPOTENCY_STATUSES)[number];

export const MIGRATION_STATUSES = ["RUNNING", "COMPLETED", "FAILED"] as const;
export type MigrationStatus = (typeof MIGRATION_STATUSES)[number];
