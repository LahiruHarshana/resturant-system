import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";

const menuCategorySchema = new Schema(
  {
    isActive: { default: true, required: true, type: Boolean },
    name: { maxlength: 120, required: true, trim: true, type: String },
    sortOrder: { default: 0, required: true, type: Number },
  },
  { strict: "throw", timestamps: true },
);

menuCategorySchema.index({ isActive: 1, sortOrder: 1 });

export type MenuCategory = InferSchemaType<typeof menuCategorySchema>;
export type MenuCategoryDocument = HydratedDocument<MenuCategory>;
export const MenuCategoryModel =
  (mongoose.models.MenuCategory as Model<MenuCategory> | undefined) ??
  mongoose.model<MenuCategory>("MenuCategory", menuCategorySchema);
