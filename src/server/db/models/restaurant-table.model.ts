import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { TABLE_STATUSES } from "./constants";
import { objectId } from "./schema-helpers";

const restaurantTableSchema = new Schema(
  {
    currentTicketId: { default: null, ref: "Ticket", type: objectId },
    label: { maxlength: 40, required: true, trim: true, type: String },
    seats: { max: 100, min: 1, required: true, type: Number },
    status: {
      default: "AVAILABLE",
      enum: TABLE_STATUSES,
      required: true,
      type: String,
    },
    zone: { maxlength: 80, required: true, trim: true, type: String },
  },
  { strict: "throw", timestamps: true },
);

restaurantTableSchema.index({ zone: 1, status: 1 });
restaurantTableSchema.index({ label: 1 }, { unique: true });

export type RestaurantTable = InferSchemaType<typeof restaurantTableSchema>;
export type RestaurantTableDocument = HydratedDocument<RestaurantTable>;
export const RestaurantTableModel =
  (mongoose.models.RestaurantTable as Model<RestaurantTable> | undefined) ??
  mongoose.model<RestaurantTable>("RestaurantTable", restaurantTableSchema);
