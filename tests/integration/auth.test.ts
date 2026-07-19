import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { authorizeCredentials } from "@/server/auth/authorize-credentials";
import { InvalidCredentialsError } from "@/server/auth/errors";
import { hashPassword } from "@/server/auth/password";
import { hashPin } from "@/server/auth/pin";
import { UserModel, RoleModel } from "@/server/db/models";

describe("Authentication Integration", () => {
  beforeAll(async () => {
    await startIntegrationDatabase();
  });

  afterAll(async () => {
    await stopIntegrationDatabase();
  });

  beforeEach(async () => {
    await clearIntegrationDatabase();
  });

  async function createTestUser({
    email = "test@example.com",
    password = "password123!",
    pin = "1234",
    isActive = true,
    pinEnabled = false,
  } = {}) {
    const role = await RoleModel.create({
      name: "test_role",
      permissions: [],
      isSystem: false,
    });

    const passwordHash = await hashPassword(password);
    const pinHash = await hashPin(pin);

    return UserModel.create({
      email,
      name: "Test User",
      passwordHash,
      pinHash,
      isActive,
      pinEnabled,
      roles: [role._id],
      sessionVersion: 1,
      rolesVersion: 1,
      failedPinAttempts: 0,
    });
  }

  describe("authorizeCredentials (Password)", () => {
    it("should return the user object for valid credentials", async () => {
      await createTestUser({
        email: "valid@example.com",
        password: "validPassword123",
      });

      const result = await authorizeCredentials({
        email: "valid@example.com",
        password: "validPassword123",
      });

      expect(result).toBeDefined();
      expect(result?.email).toBe("valid@example.com");
      expect(result?.name).toBe("Test User");
      // Ensure no hashes are returned
      expect(result).not.toHaveProperty("passwordHash");
      expect(result).not.toHaveProperty("pinHash");
    });

    it("should throw InvalidCredentialsError for invalid password", async () => {
      await createTestUser({
        email: "valid@example.com",
        password: "validPassword123",
      });

      await expect(
        authorizeCredentials({
          email: "valid@example.com",
          password: "wrongPassword",
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should throw InvalidCredentialsError for unknown email", async () => {
      await expect(
        authorizeCredentials({
          email: "unknown@example.com",
          password: "somepassword",
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should throw InvalidCredentialsError for inactive user", async () => {
      await createTestUser({ email: "inactive@example.com", isActive: false });

      await expect(
        authorizeCredentials({
          email: "inactive@example.com",
          password: "password123!",
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe("authorizeCredentials (PIN)", () => {
    it("should authenticate with a valid PIN if enabled", async () => {
      await createTestUser({
        email: "pin@example.com",
        pin: "1234",
        pinEnabled: true,
      });

      const result = await authorizeCredentials({
        email: "pin@example.com",
        pin: "1234",
      });

      expect(result).toBeDefined();
      expect(result?.email).toBe("pin@example.com");
    });

    it("should throw InvalidCredentialsError if PIN is disabled", async () => {
      await createTestUser({
        email: "nopin@example.com",
        pin: "1234",
        pinEnabled: false,
      });

      await expect(
        authorizeCredentials({
          email: "nopin@example.com",
          pin: "1234",
        }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should increment failed attempts and lock out after 5 invalid PIN attempts", async () => {
      const email = "lockout@example.com";
      await createTestUser({ email, pin: "1234", pinEnabled: true });

      for (let i = 0; i < 5; i++) {
        await expect(
          authorizeCredentials({ email, pin: "0000" }),
        ).rejects.toThrow(InvalidCredentialsError);
      }

      const user = await UserModel.findOne({ email });
      expect(user?.failedPinAttempts).toBe(5);
      expect(user?.pinLockedUntil).toBeDefined();
      expect(user?.pinLockedUntil?.getTime()).toBeGreaterThan(Date.now());

      // Should remain locked out even with correct PIN
      await expect(
        authorizeCredentials({ email, pin: "1234" }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("should reset failed attempts upon successful PIN authentication", async () => {
      const email = "reset@example.com";
      await createTestUser({ email, pin: "1234", pinEnabled: true });

      await expect(
        authorizeCredentials({ email, pin: "0000" }),
      ).rejects.toThrow(InvalidCredentialsError);

      let user = await UserModel.findOne({ email });
      expect(user?.failedPinAttempts).toBe(1);

      await authorizeCredentials({ email, pin: "1234" });

      user = await UserModel.findOne({ email });
      expect(user?.failedPinAttempts).toBe(0);
    });
  });
});
