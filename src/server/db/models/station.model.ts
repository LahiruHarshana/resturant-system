import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { STATION_TYPES } from "./constants";

const stationSchema = new Schema(
  {
    isActive: { default: true, required: true, type: Boolean },
    name: { maxlength: 120, required: true, trim: true, type: String },
    type: { enum: STATION_TYPES, required: true, type: String },
    sortOrder: { default: 0, type: Number },
  },
  { strict: "throw", timestamps: true },
);

stationSchema.index({ type: 1, isActive: 1 });

export type Station = InferSchemaType<typeof stationSchema>;
export type StationDocument = HydratedDocument<Station>;
export const StationModel =
  (mongoose.models.Station as Model<Station> | undefined) ??
  mongoose.model<Station>("Station", stationSchema);
