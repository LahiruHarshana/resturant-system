import { z } from "zod";

export const StationSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  type: z.enum(["KITCHEN", "BAR", "CUSTOM"]),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export type StationFormData = z.infer<typeof StationSchema>;

export const CategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export type CategoryFormData = z.infer<typeof CategorySchema>;

export const CategoryReorderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string(),
        sortOrder: z.number().int(),
      }),
    )
    .max(100),
});

export type CategoryReorderData = z.infer<typeof CategoryReorderSchema>;

export const ModifierOptionSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  priceDeltaMajor: z.string().regex(/^\d+(\.\d+)?$/, "Must be a valid decimal"),
});

export const ModifierGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  minSelections: z.coerce.number().int().min(0).max(20).default(0),
  maxSelections: z.coerce.number().int().min(1).max(20).default(1),
  options: z.array(ModifierOptionSchema).min(1).max(50),
});

export const MenuItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(500).optional().default(""),
  categoryId: z.string().min(1, "Category is required"),
  stationId: z.string().min(1, "Station is required"),
  priceMajor: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  isAvailable: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
  imageUrl: z.string().url().optional().or(z.literal("")).default(""),
  modifiers: z.array(ModifierGroupSchema).optional().default([]),
});

export type MenuItemFormData = z.infer<typeof MenuItemSchema>;
export type ModifierGroupFormData = z.infer<typeof ModifierGroupSchema>;
export type ModifierOptionFormData = z.infer<typeof ModifierOptionSchema>;

export const ZoneSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export type ZoneFormData = z.infer<typeof ZoneSchema>;

export const TableSchema = z.object({
  label: z.string().min(1, "Label is required").max(40),
  seats: z.coerce.number().int().min(1).max(100).default(4),
  zone: z.string().min(1, "Zone is required").max(80),
  status: z
    .enum(["AVAILABLE", "OCCUPIED", "RESERVED", "INACTIVE"])
    .default("AVAILABLE"),
});

export type TableFormData = z.infer<typeof TableSchema>;

export const RoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(500).optional().default(""),
  permissions: z.array(z.string()).optional().default([]),
});

export type RoleFormData = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Invalid email").max(254),
  phone: z.string().max(32).optional().default(""),
  roles: z.array(z.string()).min(1, "At least one role is required"),
  isActive: z.boolean().optional().default(true),
  pinEnabled: z.boolean().optional().default(false),
  resetPin: z.boolean().optional().default(false),
  resetPassword: z.boolean().optional().default(false),
});

export type UserFormData = z.infer<typeof UserSchema>;
