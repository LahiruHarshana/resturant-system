import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { objectId } from "./schema-helpers";

const auditLogSchema = new Schema(
  {
    action: { maxlength: 120, required: true, trim: true, type: String },
    actorId: { ref: "User", type: objectId },
    at: { default: () => new Date(), required: true, type: Date },
    entity: { maxlength: 120, required: true, trim: true, type: String },
    entityId: { maxlength: 120, required: true, trim: true, type: String },
    metadata: {
      default: {},
      type: Schema.Types.Mixed,
      validate: {
        message: "audit metadata is too large",
        validator: (value: unknown) =>
          JSON.stringify(value ?? {}).length <= 4_000,
      },
    },
  },
  { strict: "throw", timestamps: false },
);

auditLogSchema.index({ entity: 1, entityId: 1, at: -1 });
auditLogSchema.index({ actorId: 1, at: -1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogModel =
  (mongoose.models.AuditLog as Model<AuditLog> | undefined) ??
  mongoose.model<AuditLog>("AuditLog", auditLogSchema);
