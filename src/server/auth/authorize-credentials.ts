import { UserModel } from "@/server/db/models";
import { connectToDatabase } from "@/server/db/connect";
import { verifyPassword } from "./password";
import {
  verifyPin,
  isPinLocked,
  recordFailedPinAttempt,
  resetPinAttempts,
} from "./pin";
import { InvalidCredentialsError } from "./errors";
import { logAuthEvent } from "./audit";
import type { User } from "next-auth";

export async function authorizeCredentials(
  credentials: Partial<Record<string, unknown>>,
): Promise<User | null> {
  const email =
    typeof credentials.email === "string"
      ? credentials.email.trim().toLowerCase()
      : "";
  const password =
    typeof credentials.password === "string" ? credentials.password : undefined;
  const pin = typeof credentials.pin === "string" ? credentials.pin : undefined;

  if (!email || (!password && !pin)) {
    throw new InvalidCredentialsError("Invalid credentials format");
  }

  await connectToDatabase();

  // Load only required fields. Note: we explicitly select passwordHash and pinHash
  const user = await UserModel.findOne({ email }).select(
    "+passwordHash +pinHash",
  );

  if (!user) {
    // Avoid large timing difference by hashing a dummy string if we wanted to be perfectly secure,
    // but a generic error is enough for now.
    await logAuthEvent("LOGIN_FAILURE", { email, reason: "unknown_user" });
    throw new InvalidCredentialsError("Invalid credentials");
  }

  if (!user.isActive) {
    await logAuthEvent("LOGIN_FAILURE", {
      email,
      reason: "inactive_user",
      userId: user._id,
    });
    throw new InvalidCredentialsError("Invalid credentials");
  }

  const isPinAttempt = Boolean(pin);

  if (isPinAttempt) {
    if (!user.pinEnabled) {
      await logAuthEvent("LOGIN_FAILURE", {
        email,
        reason: "pin_disabled",
        userId: user._id,
      });
      throw new InvalidCredentialsError("Invalid credentials");
    }

    if (isPinLocked(user)) {
      await logAuthEvent("LOGIN_FAILURE", {
        email,
        reason: "pin_locked",
        userId: user._id,
      });
      throw new InvalidCredentialsError("Invalid credentials");
    }

    if (!user.pinHash) {
      await logAuthEvent("LOGIN_FAILURE", {
        email,
        reason: "no_pin_hash",
        userId: user._id,
      });
      throw new InvalidCredentialsError("Invalid credentials");
    }

    const isValidPin = await verifyPin(pin as string, user.pinHash);

    if (!isValidPin) {
      await recordFailedPinAttempt(user);

      // Re-fetch to check if locked now
      const updatedUser = await UserModel.findById(user._id);
      if (updatedUser && isPinLocked(updatedUser)) {
        await logAuthEvent("PIN_LOCKOUT", { email, userId: user._id });
      } else {
        await logAuthEvent("LOGIN_FAILURE", {
          email,
          reason: "invalid_pin",
          userId: user._id,
        });
      }

      throw new InvalidCredentialsError("Invalid credentials");
    }

    await resetPinAttempts(user);
  } else {
    // Password attempt
    if (!user.passwordHash) {
      await logAuthEvent("LOGIN_FAILURE", {
        email,
        reason: "no_password_hash",
        userId: user._id,
      });
      throw new InvalidCredentialsError("Invalid credentials");
    }

    const isValidPassword = await verifyPassword(
      password as string,
      user.passwordHash,
    );

    if (!isValidPassword) {
      await logAuthEvent("LOGIN_FAILURE", {
        email,
        reason: "invalid_password",
        userId: user._id,
      });
      throw new InvalidCredentialsError("Invalid credentials");
    }

    // Reset last login for password
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } },
    );
  }

  await logAuthEvent(
    "LOGIN_SUCCESS",
    {
      email,
      method: isPinAttempt ? "PIN" : "PASSWORD",
    },
    user._id,
  );

  // Return the Auth.js User object
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    sessionVersion: user.sessionVersion ?? 1,
    rolesVersion: user.rolesVersion ?? 1,
    authMethod: isPinAttempt ? "PIN" : "PASSWORD",
  };
}
