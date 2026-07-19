import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { objectId, nonNegativeInteger } from "./schema-helpers";

const modifierOptionSchema = new Schema(
  {
    name: { maxlength: 80, required: true, trim: true, type: String },
    priceDeltaMinor: nonNegativeInteger("priceDeltaMinor"),
  },
  { _id: false, strict: "throw" },
);

const modifierGroupSchema = new Schema(
  {
    maxSelections: { max: 20, min: 1, required: true, type: Number },
    minSelections: {
      default: 0,
      max: 20,
      min: 0,
      required: true,
      type: Number,
    },
    name: { maxlength: 80, required: true, trim: true, type: String },
    options: {
      required: true,
      type: [modifierOptionSchema],
      validate: {
        message: "modifier options must contain between 1 and 50 entries",
        validator: (options: unknown[]) =>
          options.length >= 1 && options.length <= 50,
      },
    },
  },
  { _id: false, strict: "throw" },
);

const menuItemSchema = new Schema(
  {
    categoryId: { ref: "MenuCategory", required: true, type: objectId },
    description: { maxlength: 1_000, trim: true, type: String },
    imageUrl: { maxlength: 1_000, trim: true, type: String },
    isAvailable: { default: true, required: true, type: Boolean },
    modifiers: {
      default: [],
      type: [modifierGroupSchema],
      validate: {
        message: "menu items may contain at most 20 modifier groups",
        validator: (groups: unknown[]) => groups.length <= 20,
      },
    },
    name: { maxlength: 160, required: true, trim: true, type: String },
    priceMinor: nonNegativeInteger("priceMinor"),
    sortOrder: { default: 0, required: true, type: Number },
    stationId: { ref: "Station", required: true, type: objectId },
  },
  { strict: "throw", timestamps: true },
);

menuItemSchema.index({ categoryId: 1, isAvailable: 1, sortOrder: 1 });
menuItemSchema.index({ stationId: 1, isAvailable: 1 });

export type MenuItem = InferSchemaType<typeof menuItemSchema>;
export type MenuItemDocument = HydratedDocument<MenuItem>;
export const MenuItemModel =
  (mongoose.models.MenuItem as Model<MenuItem> | undefined) ??
  mongoose.model<MenuItem>("MenuItem", menuItemSchema);
