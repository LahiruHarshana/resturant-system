import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("Password hashing", () => {
  it("should hash password to a non-plaintext string", async () => {
    const password = "mySecretPassword123!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).not.toContain(password);
    expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are 60 chars long
  });

  it("should correctly verify a valid password", async () => {
    const password = "anotherSecretPassword123!";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("should fail verification for an invalid password", async () => {
    const password = "mySecretPassword123!";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword("wrongpassword", hash);
    expect(isValid).toBe(false);
  });
});
