import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requirePasswordReauthentication,
  AuthenticationError,
} from "@/server/auth/session";

// Mock auth module
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection
vi.mock("@/server/db/connect", () => ({
  connectToDatabase: vi.fn(),
}));

// Mock UserModel
vi.mock("@/server/db/models", () => ({
  UserModel: {
    findById: vi.fn().mockReturnThis(),
    select: vi.fn(),
  },
}));

import { auth } from "@/auth";
import { UserModel } from "@/server/db/models";

describe("Session Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requirePasswordReauthentication", () => {
    it("accepts a recent PASSWORD session", async () => {
      // Mock auth() returning a session with PASSWORD auth method 5 minutes ago

      (auth as unknown as import("vitest").Mock).mockResolvedValue({
        user: {
          id: "mock-id",
          sessionVersion: 1,
          authMethod: "PASSWORD",
          authTime: Date.now() - 5 * 60 * 1000,
        },
        expires: "2099-01-01T00:00:00.000Z",
      });

      // Mock UserModel finding the active user with matching version

      (
        UserModel as unknown as { select: import("vitest").Mock }
      ).select.mockResolvedValue({
        _id: "mock-id",
        isActive: true,
        sessionVersion: 1,
      });

      const session = await requirePasswordReauthentication(15);
      expect(session).toBeDefined();
    });

    it("rejects a PIN session", async () => {
      (auth as unknown as import("vitest").Mock).mockResolvedValue({
        user: {
          id: "mock-id",
          sessionVersion: 1,
          authMethod: "PIN",
          authTime: Date.now(),
        },
        expires: "2099-01-01T00:00:00.000Z",
      });

      (
        UserModel as unknown as { select: import("vitest").Mock }
      ).select.mockResolvedValue({
        _id: "mock-id",
        isActive: true,
        sessionVersion: 1,
      });

      await expect(requirePasswordReauthentication(15)).rejects.toThrow(
        AuthenticationError,
      );
      await expect(requirePasswordReauthentication(15)).rejects.toThrow(
        "Password authentication required for this action",
      );
    });

    it("rejects an old PASSWORD authentication when freshness is required", async () => {
      // 20 minutes old

      (auth as unknown as import("vitest").Mock).mockResolvedValue({
        user: {
          id: "mock-id",
          sessionVersion: 1,
          authMethod: "PASSWORD",
          authTime: Date.now() - 20 * 60 * 1000,
        },
        expires: "2099-01-01T00:00:00.000Z",
      });

      (
        UserModel as unknown as { select: import("vitest").Mock }
      ).select.mockResolvedValue({
        _id: "mock-id",
        isActive: true,
        sessionVersion: 1,
      });

      await expect(requirePasswordReauthentication(15)).rejects.toThrow(
        AuthenticationError,
      );
      await expect(requirePasswordReauthentication(15)).rejects.toThrow(
        "Password reauthentication required (session too old)",
      );
    });
  });
});
