import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

const zoneSchema = new Schema(
  {
    isActive: { default: true, required: true, type: Boolean },
    name: { maxlength: 120, required: true, trim: true, type: String },
    sortOrder: { default: 0, required: true, type: Number },
  },
  { strict: "throw", timestamps: true },
);

zoneSchema.index({ name: 1 }, { unique: true });
zoneSchema.index({ isActive: 1, sortOrder: 1 });

export type Zone = InferSchemaType<typeof zoneSchema>;
export type ZoneDocument = HydratedDocument<Zone>;
export const ZoneModel =
  (mongoose.models.Zone as Model<Zone> | undefined) ??
  mongoose.model<Zone>("Zone", zoneSchema);
