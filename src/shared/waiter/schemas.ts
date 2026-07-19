import { z } from "zod";

export const OpenTicketSchema = z.object({
  tableId: z.string().min(1, "Table ID is required"),
  guestCount: z.coerce.number().int().min(1).max(100).default(1),
  idempotencyKey: z.string().optional(),
});

export type OpenTicketRequest = z.infer<typeof OpenTicketSchema>;

export const FloorTableDTOSchema = z.object({
  id: z.string(),
  label: z.string(),
  zone: z.string(),
  seats: z.number().int(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "INACTIVE"]),
  currentTicketId: z.string().nullable(),
  openedAt: z.string().nullable(), // ISO string for elapsed time
  ticketNo: z.number().int().nullable(),
  isReady: z.boolean().default(false), // READY item indicator when applicable
});

export type FloorTableDTO = z.infer<typeof FloorTableDTOSchema>;

export const FloorZoneDTOSchema = z.object({
  zoneName: z.string(),
  sortOrder: z.number().int(),
  tables: z.array(FloorTableDTOSchema),
});

export type FloorZoneDTO = z.infer<typeof FloorZoneDTOSchema>;

export const TicketDTOSchema = z.object({
  id: z.string(),
  ticketNo: z.number().int(),
  tableId: z.string(),
  waiterId: z.string(),
  status: z.enum(["OPEN", "PAID", "CANCELLED", "CLOSED"]),
  guestCount: z.number().int(),
  openedAt: z.string(),
  subtotalMinor: z.number().int().optional(),
  taxMinor: z.number().int().optional(),
  serviceChargeMinor: z.number().int().optional(),
  totalMinor: z.number().int().optional(),
  tableLabel: z.string().optional(),
});

export type TicketDTO = z.infer<typeof TicketDTOSchema>;

// --- Waiter Menu Schemas ---

export const WaiterMenuCategoryDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type WaiterMenuCategoryDTO = z.infer<typeof WaiterMenuCategoryDTOSchema>;

export const ModifierOptionDTOSchema = z.object({
  name: z.string(),
  priceDeltaMinor: z.number().int().min(0),
});
export type ModifierOptionDTO = z.infer<typeof ModifierOptionDTOSchema>;

export const ModifierGroupDTOSchema = z.object({
  name: z.string(),
  minSelections: z.number().int().min(0),
  maxSelections: z.number().int().min(1),
  options: z.array(ModifierOptionDTOSchema),
});
export type ModifierGroupDTO = z.infer<typeof ModifierGroupDTOSchema>;

export const WaiterMenuItemDTOSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  priceMinor: z.number().int().min(0),
  stationId: z.string(),
  modifiers: z.array(ModifierGroupDTOSchema).optional(),
});
export type WaiterMenuItemDTO = z.infer<typeof WaiterMenuItemDTOSchema>;

export const WaiterMenuDTOSchema = z.object({
  categories: z.array(WaiterMenuCategoryDTOSchema),
  items: z.array(WaiterMenuItemDTOSchema),
});
export type WaiterMenuDTO = z.infer<typeof WaiterMenuDTOSchema>;

// --- Order Composer Schemas ---

export const OrderLineModifierSelectionSchema = z.object({
  groupName: z.string(),
  optionName: z.string(),
});
export type OrderLineModifierSelection = z.infer<
  typeof OrderLineModifierSelectionSchema
>;

export const ComposerLineRequestSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1).max(100),
  note: z.string().max(500).optional().default(""),
  modifierSelections: z
    .array(OrderLineModifierSelectionSchema)
    .optional()
    .default([]),
});
export type ComposerLineRequest = z.infer<typeof ComposerLineRequestSchema>;

export const FireOrderRequestSchema = z.object({
  lines: z
    .array(ComposerLineRequestSchema)
    .min(1, "Order must contain at least one item"),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
});
export type FireOrderRequest = z.infer<typeof FireOrderRequestSchema>;

export const OrderLineDTOSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  nameSnapshot: z.string(),
  priceSnapshotMinor: z.number().int(),
  quantity: z.number().int(),
  note: z.string().optional(),
  modifierSnapshots: z.array(
    z.object({
      nameSnapshot: z.string(),
      priceDeltaMinor: z.number().int(),
    }),
  ),
  stationTypeSnapshot: z.string(),
  status: z.enum(["NEW", "PREPARING", "READY", "SERVED", "VOID"]),
  firedAt: z.string().optional(),
});
export type OrderLineDTO = z.infer<typeof OrderLineDTOSchema>;

export const StationFiredPayloadSchema = z.object({
  stationId: z.string(),
  stationTypeSnapshot: z.string(),
  tableLabel: z.string(),
  lines: z.array(OrderLineDTOSchema),
});
export type StationFiredPayload = z.infer<typeof StationFiredPayloadSchema>;

export const FireTicketLinesRequestSchema = z.object({
  lineIds: z.array(z.string()).min(1, "Must select at least one line to fire"),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
});
export type FireTicketLinesRequest = z.infer<
  typeof FireTicketLinesRequestSchema
>;

export const FireOrderResponseSchema = z.object({
  success: z.boolean(),
  ticket: TicketDTOSchema,
  stations: z.array(StationFiredPayloadSchema),
});
export type FireOrderResponse = z.infer<typeof FireOrderResponseSchema>;

export const MarkLineServedRequestSchema = z.object({
  idempotencyKey: z.string().uuid("Invalid idempotency key format"),
});

export type MarkLineServedRequest = z.infer<typeof MarkLineServedRequestSchema>;

export const TicketComposerResponseSchema = z.object({
  success: z.boolean(),
  ticket: TicketDTOSchema,
  lines: z.array(OrderLineDTOSchema),
});
export type TicketComposerResponse = z.infer<
  typeof TicketComposerResponseSchema
>;
