import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

const roleSchema = new Schema(
  {
    description: { maxlength: 500, trim: true, type: String },
    isSystem: { default: false, required: true, type: Boolean },
    name: {
      lowercase: true,
      maxlength: 80,
      required: true,
      trim: true,
      type: String,
    },
    permissions: [{ maxlength: 120, required: true, trim: true, type: String }],
  },
  { strict: "throw", timestamps: true },
);

roleSchema.index({ name: 1 }, { unique: true });

export type Role = InferSchemaType<typeof roleSchema>;
export type RoleDocument = HydratedDocument<Role>;
export const RoleModel =
  (mongoose.models.Role as Model<Role> | undefined) ??
  mongoose.model<Role>("Role", roleSchema);
