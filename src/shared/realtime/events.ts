import { z } from "zod";

// Base payload schema fields
const BaseEventPayloadSchema = z.object({
  id: z.string(),
  version: z.number().int().nonnegative().optional(),
  timestamp: z.string().datetime(), // Server timestamp ISO string
  correlationId: z.string().optional(),
});

// Event specific schemas
export const LineCreatedEventSchema = BaseEventPayloadSchema.extend({
  ticketId: z.string(),
  ticketNo: z.number().int().nonnegative(),
  stationId: z.string(),
  stationTypeSnapshot: z.string(),
  status: z.string(),
  itemNameSnapshot: z.string(),
  quantity: z.number().int().positive(),
  modifierSnapshots: z.array(z.any()).optional(), // Optional modifier data if needed by KDS
  firedAt: z.string().datetime().optional(),
});

export const LineStatusChangedEventSchema = BaseEventPayloadSchema.extend({
  ticketId: z.string(),
  stationId: z.string(),
  status: z.string(),
  previousStatus: z.string().optional(),
});

export const TicketUpdatedEventSchema = BaseEventPayloadSchema.extend({
  tableId: z.string().optional(),
  status: z.string(),
  subtotalMinor: z.number().int(),
  taxMinor: z.number().int(),
  serviceChargeMinor: z.number().int(),
  totalMinor: z.number().int(),
});

export const TicketClosedEventSchema = BaseEventPayloadSchema.extend({
  tableId: z.string().optional(),
});

export const TicketPaidEventSchema = BaseEventPayloadSchema.extend({
  tableId: z.string().optional(),
  amountMinor: z.number().int(),
});

export const PermissionsChangedEventSchema = BaseEventPayloadSchema.extend({
  userId: z.string(),
});

// A discriminated union could be useful, but for now we export individual schemas.
// The constants for event names:
export const REALTIME_EVENTS = {
  LINE_CREATED_V1: "line.created.v1",
  LINE_STATUS_CHANGED_V1: "line.status-changed.v1",
  TICKET_UPDATED_V1: "ticket.updated.v1",
  TICKET_CLOSED_V1: "ticket.closed.v1",
  TICKET_PAID_V1: "ticket.paid.v1",
  PERMISSIONS_CHANGED_V1: "permissions.changed.v1",
} as const;

export type LineCreatedEventPayload = z.infer<typeof LineCreatedEventSchema>;
export type LineStatusChangedEventPayload = z.infer<
  typeof LineStatusChangedEventSchema
>;
export type TicketUpdatedEventPayload = z.infer<
  typeof TicketUpdatedEventSchema
>;
export type TicketClosedEventPayload = z.infer<typeof TicketClosedEventSchema>;
export type TicketPaidEventPayload = z.infer<typeof TicketPaidEventSchema>;
export type PermissionsChangedEventPayload = z.infer<
  typeof PermissionsChangedEventSchema
>;
