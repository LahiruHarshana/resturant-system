import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { IDEMPOTENCY_STATUSES } from "./constants";

const idempotencyRecordSchema = new Schema(
  {
    expiresAt: { required: true, type: Date },
    key: { maxlength: 200, required: true, trim: true, type: String },
    requestHash: { maxlength: 128, required: true, trim: true, type: String },
    responseRef: { maxlength: 200, trim: true, type: String },
    resultMetadata: {
      default: {},
      type: Schema.Types.Mixed,
      validate: {
        message: "idempotency metadata is too large",
        validator: (value: unknown) =>
          JSON.stringify(value ?? {}).length <= 2_000,
      },
    },
    scope: { maxlength: 120, required: true, trim: true, type: String },
    status: { enum: IDEMPOTENCY_STATUSES, required: true, type: String },
  },
  { strict: "throw", timestamps: true },
);

idempotencyRecordSchema.index({ key: 1, scope: 1 }, { unique: true });
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type IdempotencyRecord = InferSchemaType<typeof idempotencyRecordSchema>;
export type IdempotencyRecordDocument = HydratedDocument<IdempotencyRecord>;
export const IdempotencyRecordModel =
  (mongoose.models.IdempotencyRecord as Model<IdempotencyRecord> | undefined) ??
  mongoose.model<IdempotencyRecord>(
    "IdempotencyRecord",
    idempotencyRecordSchema,
  );
