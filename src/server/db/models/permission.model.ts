import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

const permissionSchema = new Schema(
  {
    description: { maxlength: 500, trim: true, type: String },
    group: { maxlength: 80, required: true, trim: true, type: String },
    key: { maxlength: 120, required: true, trim: true, type: String },
    label: { maxlength: 120, required: true, trim: true, type: String },
  },
  { strict: "throw", timestamps: true },
);

permissionSchema.index({ key: 1 }, { unique: true });

export type Permission = InferSchemaType<typeof permissionSchema>;
export type PermissionDocument = HydratedDocument<Permission>;
export const PermissionModel =
  (mongoose.models.Permission as Model<Permission> | undefined) ??
  mongoose.model<Permission>("Permission", permissionSchema);
