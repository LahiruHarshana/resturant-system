import bcrypt from "bcryptjs";

/**
 * Standard cost factor. 12 is recommended for modern web apps.
 */
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  passwordAttempt: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(passwordAttempt, hash);
}
