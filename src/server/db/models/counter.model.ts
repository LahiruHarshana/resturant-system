import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

const counterSchema = new Schema(
  {
    key: { maxlength: 80, required: true, trim: true, type: String },
    seq: { default: 0, min: 0, required: true, type: Number },
  },
  { strict: "throw", timestamps: true },
);

counterSchema.index({ key: 1 }, { unique: true });

export type Counter = InferSchemaType<typeof counterSchema>;
export type CounterDocument = HydratedDocument<Counter>;
export const CounterModel =
  (mongoose.models.Counter as Model<Counter> | undefined) ??
  mongoose.model<Counter>("Counter", counterSchema);

export async function getNextSequence(
  key: string,
  session?: mongoose.ClientSession,
) {
  const counter = await CounterModel.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    {
      projection: { seq: 1 },
      returnDocument: "after",
      setDefaultsOnInsert: true,
      upsert: true,
      session,
    },
  ).lean<{ seq: number }>();

  if (!counter) {
    throw new Error("Counter update failed");
  }

  return counter.seq;
}

export function getNextTicketNumber(session?: mongoose.ClientSession) {
  return getNextSequence("ticketNo", session);
}
