import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { ORDER_LINE_STATUSES, STATION_TYPES } from "./constants";
import { nonNegativeInteger, objectId } from "./schema-helpers";

const modifierSnapshotSchema = new Schema(
  {
    nameSnapshot: { maxlength: 80, required: true, trim: true, type: String },
    priceDeltaMinor: nonNegativeInteger("priceDeltaMinor"),
  },
  { _id: false, strict: "throw" },
);

const orderLineSchema = new Schema(
  {
    firedAt: { type: Date },
    menuItemId: { ref: "MenuItem", required: true, type: objectId },
    modifierSnapshots: { default: [], type: [modifierSnapshotSchema] },
    nameSnapshot: { maxlength: 160, required: true, trim: true, type: String },
    note: { maxlength: 500, trim: true, type: String },
    preparingAt: { type: Date },
    priceSnapshotMinor: nonNegativeInteger("priceSnapshotMinor"),
    quantity: { min: 1, required: true, type: Number },
    readyAt: { type: Date },
    servedAt: { type: Date },
    stationId: { ref: "Station", required: true, type: objectId },
    stationTypeSnapshot: { enum: STATION_TYPES, required: true, type: String },
    status: {
      default: "NEW",
      enum: ORDER_LINE_STATUSES,
      required: true,
      type: String,
    },
    ticketId: { ref: "Ticket", required: true, type: objectId },
    voidReason: { maxlength: 500, trim: true, type: String },
    voidedAt: { type: Date },
  },
  { strict: "throw", timestamps: true },
);

orderLineSchema.index({ ticketId: 1, status: 1 });
orderLineSchema.index({ stationId: 1, status: 1, firedAt: 1 });

export type OrderLine = InferSchemaType<typeof orderLineSchema>;
export type OrderLineDocument = HydratedDocument<OrderLine>;
export const OrderLineModel =
  (mongoose.models.OrderLine as Model<OrderLine> | undefined) ??
  mongoose.model<OrderLine>("OrderLine", orderLineSchema);
