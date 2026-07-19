import { z } from "zod";
const ORDER_LINE_STATUSES = [
  "NEW",
  "PREPARING",
  "READY",
  "SERVED",
  "VOID",
] as const;

export const StationQueueLineSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  ticketNo: z.number(),
  tableLabel: z.string().optional(),
  status: z.enum(ORDER_LINE_STATUSES),
  itemNameSnapshot: z.string(),
  quantity: z.number(),
  modifierSnapshots: z.array(z.any()),
  note: z.string().optional(),
  firedAt: z.string().datetime().optional(),
});

export const StationQueueSchema = z.object({
  lines: z.array(StationQueueLineSchema),
});

export type StationQueueLineDTO = z.infer<typeof StationQueueLineSchema>;
export type StationQueueDTO = z.infer<typeof StationQueueSchema>;

export const UpdateLineStatusSchema = z.object({
  status: z.enum(["PREPARING", "READY"]),
});

export type UpdateLineStatusDTO = z.infer<typeof UpdateLineStatusSchema>;
