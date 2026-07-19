import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { restaurantSettingsSchema } from "@/shared/contracts/restaurant-settings";

const restaurantSettingsModelSchema = new Schema(
  {
    currency: {
      maxlength: 3,
      minlength: 3,
      required: true,
      trim: true,
      type: String,
      uppercase: true,
    },
    currencyMinorDigits: { max: 4, min: 0, required: true, type: Number },
    kitchenAgingMinutes: { min: 1, required: true, type: Number },
    key: { default: "default", immutable: true, required: true, type: String },
    readySoundEnabled: { default: true, required: true, type: Boolean },
    receiptFooter: { maxlength: 500, trim: true, type: String },
    restaurantName: {
      default: "My Restaurant",
      maxlength: 100,
      minlength: 1,
      required: true,
      trim: true,
      type: String,
    },
    restaurantAddress: { maxlength: 200, trim: true, type: String },
    restaurantPhone: { maxlength: 50, trim: true, type: String },
    restaurantEmail: { maxlength: 100, trim: true, type: String },
    serviceChargeBps: { max: 10_000, min: 0, required: true, type: Number },
    taxBps: { max: 10_000, min: 0, required: true, type: Number },
    urgentAgingMinutes: { min: 1, required: true, type: Number },
  },
  { strict: "throw", timestamps: true },
);

restaurantSettingsModelSchema.index({ key: 1 }, { unique: true });
restaurantSettingsModelSchema.pre("validate", function validateSettings() {
  const parsed = restaurantSettingsSchema.safeParse({
    currency: this.currency,
    currencyMinorDigits: this.currencyMinorDigits,
    kitchenAgingMinutes: this.kitchenAgingMinutes,
    readySoundEnabled: this.readySoundEnabled,
    receiptFooter: this.receiptFooter,
    restaurantName: this.restaurantName,
    restaurantAddress: this.restaurantAddress,
    restaurantPhone: this.restaurantPhone,
    restaurantEmail: this.restaurantEmail,
    serviceChargeBps: this.serviceChargeBps,
    taxBps: this.taxBps,
    urgentAgingMinutes: this.urgentAgingMinutes,
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((issue) => issue.message).join("; "),
    );
  }
});

export type RestaurantSettingsRecord = InferSchemaType<
  typeof restaurantSettingsModelSchema
>;
export type RestaurantSettingsDocument =
  HydratedDocument<RestaurantSettingsRecord>;
export const RestaurantSettingsModel =
  (mongoose.models.RestaurantSettings as
    Model<RestaurantSettingsRecord> | undefined) ??
  mongoose.model<RestaurantSettingsRecord>(
    "RestaurantSettings",
    restaurantSettingsModelSchema,
  );
