import mongoose from "mongoose";
import { requirePermission } from "@/server/auth/authorization";
import { UserModel } from "@/server/db/models/user.model";
import { RoleModel } from "@/server/db/models/role.model";
import { AuditLogModel } from "@/server/db/models/audit-log.model";
import { UserSchema, type UserFormData } from "@/shared/admin/schemas";
import { connectToDatabase } from "@/server/db/connect";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function getUsers() {
  await requirePermission("user:manage");
  await connectToDatabase();

  const users = await UserModel.find()
    .populate("roles", "name _id")
    .sort({ name: 1 })
    .lean();

  return users.map((u) => {
    const doc = u as unknown as {
      _id: mongoose.Types.ObjectId;
      roles: Array<{ _id: mongoose.Types.ObjectId; name: string }>;
      name: string;
      email: string;
      phone: string;
      isActive: boolean;
      pinEnabled: boolean;
    };
    return {
      ...doc,
      _id: doc._id.toString(),
      roles: doc.roles.map((r) => ({ _id: r._id.toString(), name: r.name })),
    };
  });
}

function generateRandomPassword() {
  return crypto.randomBytes(6).toString("hex"); // 12 chars
}

function generateRandomPin() {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
}

export async function createUser(data: UserFormData) {
  const session = await requirePermission("user:manage");
  const validated = UserSchema.parse(data);
  await connectToDatabase();

  const existingUser = await UserModel.findOne({
    email: validated.email.toLowerCase(),
  });
  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  // Validate roles
  const roles = await RoleModel.find({ _id: { $in: validated.roles } });
  if (roles.length !== validated.roles.length) {
    throw new Error("One or more invalid roles provided");
  }

  const tempPassword = generateRandomPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  let pinHash = undefined;
  let tempPin = undefined;
  if (validated.pinEnabled) {
    tempPin = generateRandomPin();
    pinHash = await bcrypt.hash(tempPin, 10);
  }

  const user = await UserModel.create({
    name: validated.name,
    email: validated.email.toLowerCase(),
    phone: validated.phone,
    isActive: validated.isActive,
    roles: validated.roles,
    pinEnabled: validated.pinEnabled,
    passwordHash,
    pinHash,
  });

  await AuditLogModel.create({
    actorId: session.userId,
    action: "CREATE_USER",
    entity: "User",
    entityId: user._id.toString(),
    metadata: { email: user.email },
  });

  return {
    success: true,
    userId: user._id.toString(),
    tempPassword,
    tempPin,
  };
}

export async function updateUser(id: string, data: UserFormData) {
  const session = await requirePermission("user:manage");
  const validated = UserSchema.parse(data);
  await connectToDatabase();

  const existingUser = await UserModel.findOne({
    _id: { $ne: id },
    email: validated.email.toLowerCase(),
  });
  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const oldUser = await UserModel.findById(id).select("+passwordHash +pinHash");
  if (!oldUser) {
    throw new Error("User not found");
  }

  if (oldUser._id.toString() === session.userId && !validated.isActive) {
    throw new Error("You cannot deactivate your own account");
  }

  // Validate roles
  const roles = await RoleModel.find({ _id: { $in: validated.roles } });
  if (roles.length !== validated.roles.length) {
    throw new Error("One or more invalid roles provided");
  }

  const updates: Record<string, unknown> = {
    name: validated.name,
    email: validated.email.toLowerCase(),
    phone: validated.phone,
    isActive: validated.isActive,
    roles: validated.roles,
    pinEnabled: validated.pinEnabled,
  };

  let tempPassword = undefined;
  let tempPin = undefined;

  if (validated.resetPassword) {
    tempPassword = generateRandomPassword();
    updates["passwordHash"] = await bcrypt.hash(tempPassword, 10);
  }

  if (validated.resetPin && validated.pinEnabled) {
    tempPin = generateRandomPin();
    updates["pinHash"] = await bcrypt.hash(tempPin, 10);
  }

  // Handle forcing session invalidate
  const roleChanged =
    oldUser.roles
      .map((r) => r.toString())
      .sort()
      .join() !== validated.roles.slice().sort().join();
  if (roleChanged || (oldUser.isActive && !validated.isActive)) {
    // We increment versions to log them out or refresh tokens
    updates["$inc"] = { rolesVersion: 1, sessionVersion: 1 };
  }

  const user = await UserModel.findByIdAndUpdate(id, updates, {
    returnDocument: "after",
  });

  const updatedDoc = user as unknown as {
    _id: mongoose.Types.ObjectId;
    email: string;
  };

  await AuditLogModel.create({
    actorId: session.userId,
    action: "UPDATE_USER",
    entity: "User",
    entityId: updatedDoc._id.toString(),
    metadata: { email: updatedDoc.email },
  });

  return {
    success: true,
    tempPassword,
    tempPin,
  };
}
