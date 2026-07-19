import mongoose from "mongoose";
import { AuditLogModel } from "@/server/db/models";

export async function logAuthEvent(
  action:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILURE"
    | "PIN_LOCKOUT"
    | "LOGOUT"
    | "SESSION_INVALIDATED",
  details: Record<string, unknown>,
  userId?: unknown,
): Promise<void> {
  try {
    const stringId = userId ? String(userId) : "SYSTEM";
    await AuditLogModel.create({
      action,
      entityId: stringId,
      entity: "USER",
      metadata: details,
      actorId:
        typeof userId === "string" || userId instanceof mongoose.Types.ObjectId
          ? userId
          : undefined,
    });
  } catch (error) {
    // We swallow the error because authentication must not fail solely because audit writing fails.
    console.error("Failed to write auth audit log:", error);
  }
}
