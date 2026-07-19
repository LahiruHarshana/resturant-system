import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { PAYMENT_METHODS } from "./constants";
import { nonNegativeInteger, objectId } from "./schema-helpers";

const paymentSchema = new Schema(
  {
    amountMinor: nonNegativeInteger("amountMinor"),
    cashierId: { ref: "User", required: true, type: objectId },
    changeMinor: { ...nonNegativeInteger("changeMinor"), default: 0 },
    idempotencyKey: {
      maxlength: 160,
      required: true,
      trim: true,
      type: String,
    },
    method: { enum: PAYMENT_METHODS, required: true, type: String },
    tenderedMinor: nonNegativeInteger("tenderedMinor"),
    ticketId: { ref: "Ticket", required: true, type: objectId },
  },
  { strict: "throw", timestamps: { createdAt: true, updatedAt: false } },
);

paymentSchema.index({ ticketId: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ idempotencyKey: 1, ticketId: 1 }, { unique: true });

export type Payment = InferSchemaType<typeof paymentSchema>;
export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentModel =
  (mongoose.models.Payment as Model<Payment> | undefined) ??
  mongoose.model<Payment>("Payment", paymentSchema);
