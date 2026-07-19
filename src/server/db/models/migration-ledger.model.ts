import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { MIGRATION_STATUSES } from "./constants";

const migrationLedgerSchema = new Schema(
  {
    checksum: { maxlength: 128, required: true, trim: true, type: String },
    completedAt: { type: Date },
    errorSummary: { maxlength: 1_000, trim: true, type: String },
    failedCount: { default: 0, min: 0, required: true, type: Number },
    migrationId: { maxlength: 80, required: true, trim: true, type: String },
    name: { maxlength: 160, required: true, trim: true, type: String },
    processedCount: { default: 0, min: 0, required: true, type: Number },
    startedAt: { default: () => new Date(), required: true, type: Date },
    status: { enum: MIGRATION_STATUSES, required: true, type: String },
  },
  { strict: "throw", timestamps: true },
);

migrationLedgerSchema.index({ migrationId: 1 }, { unique: true });

export type MigrationLedger = InferSchemaType<typeof migrationLedgerSchema>;
export type MigrationLedgerDocument = HydratedDocument<MigrationLedger>;
export const MigrationLedgerModel =
  (mongoose.models.MigrationLedger as Model<MigrationLedger> | undefined) ??
  mongoose.model<MigrationLedger>("MigrationLedger", migrationLedgerSchema);
