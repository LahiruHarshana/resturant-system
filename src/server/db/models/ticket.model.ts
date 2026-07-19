import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { TICKET_STATUSES } from "./constants";
import { nonNegativeInteger, objectId } from "./schema-helpers";

const ticketSchema = new Schema(
  {
    cancellationReason: { maxlength: 500, trim: true, type: String },
    cancelledAt: { type: Date },
    closedAt: { type: Date },
    discountMinor: { ...nonNegativeInteger("discountMinor"), default: 0 },
    guestCount: { min: 1, type: Number },
    openedAt: { default: () => new Date(), required: true, type: Date },
    paidAt: { type: Date },
    serviceChargeMinor: {
      ...nonNegativeInteger("serviceChargeMinor"),
      default: 0,
    },
    status: {
      default: "OPEN",
      enum: TICKET_STATUSES,
      required: true,
      type: String,
    },
    subtotalMinor: { ...nonNegativeInteger("subtotalMinor"), default: 0 },
    tableId: { ref: "RestaurantTable", required: true, type: objectId },
    taxMinor: { ...nonNegativeInteger("taxMinor"), default: 0 },
    ticketNo: { required: true, type: Number },
    totalMinor: { ...nonNegativeInteger("totalMinor"), default: 0 },
    waiterId: { ref: "User", required: true, type: objectId },
  },
  { strict: "throw", timestamps: true },
);

ticketSchema.index({ ticketNo: 1 }, { unique: true });
ticketSchema.index({ tableId: 1, status: 1 });
ticketSchema.index(
  { tableId: 1 },
  { partialFilterExpression: { status: "OPEN" }, unique: true },
);
ticketSchema.index({ waiterId: 1, status: 1, openedAt: -1 });
ticketSchema.index({ status: 1, closedAt: 1 });

export type Ticket = InferSchemaType<typeof ticketSchema>;
export type TicketDocument = HydratedDocument<Ticket>;
export const TicketModel =
  (mongoose.models.Ticket as Model<Ticket> | undefined) ??
  mongoose.model<Ticket>("Ticket", ticketSchema);
