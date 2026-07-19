import { verifyPassword, hashPassword } from "./password";
import { UserModel, type UserDocument } from "@/server/db/models";

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 15;

export async function hashPin(pin: string): Promise<string> {
  // Using bcrypt for PINs as well, though a lower cost might be acceptable for 4-digit PINs
  // since they are vulnerable to brute force offline anyway. We'll stick to the standard cost 12.
  return hashPassword(pin);
}

export async function verifyPin(
  pinAttempt: string,
  hash: string,
): Promise<boolean> {
  return verifyPassword(pinAttempt, hash);
}

/**
 * Handles PIN lockout logic for a given user.
 * Call this when a PIN attempt fails.
 */
export async function recordFailedPinAttempt(
  user: UserDocument,
): Promise<void> {
  const currentAttempts = (user.failedPinAttempts ?? 0) + 1;
  const updates: Record<string, unknown> = {
    failedPinAttempts: currentAttempts,
  };

  if (currentAttempts >= MAX_PIN_ATTEMPTS) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + PIN_LOCKOUT_MINUTES);
    updates.pinLockedUntil = lockUntil;
  }

  await UserModel.updateOne({ _id: user._id }, { $set: updates });
}

/**
 * Call this when a PIN attempt succeeds to reset the lockout state.
 */
export async function resetPinAttempts(user: UserDocument): Promise<void> {
  await UserModel.updateOne(
    { _id: user._id },
    {
      $set: {
        failedPinAttempts: 0,
        lastPinLoginAt: new Date(),
        pinLockedUntil: null,
      },
    },
  );
}

/**
 * Returns true if the user's PIN is currently locked due to too many failed attempts.
 */
export function isPinLocked(user: UserDocument): boolean {
  if (user.pinLockedUntil && user.pinLockedUntil.getTime() > Date.now()) {
    return true;
  }
  return false;
}
