import mongoose, {
  Schema,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
} from "mongoose";
import { objectId, stripSensitiveTransform } from "./schema-helpers";

const userSchema = new Schema(
  {
    email: {
      lowercase: true,
      maxlength: 254,
      required: true,
      trim: true,
      type: String,
    },
    failedPinAttempts: { default: 0, required: true, type: Number },
    isActive: { default: true, required: true, type: Boolean },
    lastLoginAt: { type: Date },
    lastPinLoginAt: { type: Date },
    name: { maxlength: 120, required: true, trim: true, type: String },
    passwordHash: { required: true, select: false, type: String },
    phone: { maxlength: 32, trim: true, type: String },
    pinEnabled: { default: false, required: true, type: Boolean },
    pinHash: { select: false, type: String },
    pinLockedUntil: { type: Date },
    roles: [{ ref: "Role", required: true, type: objectId }],
    rolesVersion: { default: 1, required: true, type: Number },
    sessionVersion: { default: 1, required: true, type: Number },
  },
  {
    strict: "throw",
    timestamps: true,
    toJSON: { transform: stripSensitiveTransform },
    toObject: { transform: stripSensitiveTransform },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ isActive: 1 });

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export const UserModel =
  (mongoose.models.User as Model<User> | undefined) ??
  mongoose.model<User>("User", userSchema);
