import { Schema } from "mongoose";

export const objectId = Schema.Types.ObjectId;

export function nonNegativeInteger(pathLabel: string) {
  return {
    min: [0, `${pathLabel} must be non-negative`],
    required: true,
    type: Number,
    validate: {
      message: `${pathLabel} must be a safe integer`,
      validator: Number.isSafeInteger,
    },
  } as const;
}

export function optionalNonNegativeInteger(pathLabel: string) {
  return {
    min: [0, `${pathLabel} must be non-negative`],
    type: Number,
    validate: {
      message: `${pathLabel} must be a safe integer`,
      validator: (value: number | undefined) =>
        value === undefined || Number.isSafeInteger(value),
    },
  } as const;
}

export function stripSensitiveTransform(
  _document: unknown,
  ret: Record<string, unknown>,
) {
  delete ret.passwordHash;
  delete ret.pinHash;
  delete ret.__v;
  return ret;
}
