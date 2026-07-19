import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveEffectivePermissions,
  requirePermission,
} from "@/server/auth/authorization";
import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/db/models", () => ({
  UserModel: {
    findById: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  },
  RoleModel: {
    find: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  },
}));

import { auth } from "@/auth";
import { UserModel, RoleModel } from "@/server/db/models";

describe("Authorization Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveEffectivePermissions", () => {
    it("rejects an inactive user", async () => {
      (
        UserModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue({
        isActive: false,
      });

      await expect(resolveEffectivePermissions("user-1")).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("resolves single role permissions", async () => {
      (
        UserModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue({
        isActive: true,
        roles: ["role-1"],
        rolesVersion: 1,
      });

      (
        RoleModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue([
        { permissions: ["table:read", "order:create"] },
      ]);

      const result = await resolveEffectivePermissions("user-1");
      expect(result.rolesVersion).toBe(1);
      expect(result.permissions.has("table:read")).toBe(true);
      expect(result.permissions.has("order:create")).toBe(true);
      expect(result.permissions.has("audit:view")).toBe(false);
    });

    it("resolves multi-role permissions and deduplicates (Waiter + Bar)", async () => {
      (
        UserModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue({
        isActive: true,
        roles: ["role-waiter", "role-bar"],
        rolesVersion: 2,
      });

      (
        RoleModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue([
        { permissions: ["table:read", "order:create"] },
        { permissions: ["table:read", "line:read:bar"] },
      ]);

      const result = await resolveEffectivePermissions("user-1");
      expect(result.rolesVersion).toBe(2);
      expect(result.permissions.size).toBe(3); // Deduplicated "table:read"
      expect(result.permissions.has("table:read")).toBe(true);
      expect(result.permissions.has("order:create")).toBe(true);
      expect(result.permissions.has("line:read:bar")).toBe(true);
      expect(result.permissions.has("line:read:kitchen")).toBe(false);
    });

    it("safely ignores deleted or missing roles", async () => {
      (
        UserModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue({
        isActive: true,
        roles: ["role-valid", "role-deleted"],
        rolesVersion: 1,
      });

      (
        RoleModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue([
        { permissions: ["table:read"] },
        // role-deleted is not returned
      ]);

      const result = await resolveEffectivePermissions("user-1");
      expect(result.permissions.size).toBe(1);
      expect(result.permissions.has("table:read")).toBe(true);
    });
  });

  describe("requirePermission", () => {
    it("throws AuthenticationError if not logged in", async () => {
      (auth as unknown as import("vitest").Mock).mockResolvedValue(null);

      await expect(requirePermission("audit:view")).rejects.toThrow(
        AuthenticationError,
      );
    });

    it("throws AuthorizationError if user lacks permission", async () => {
      (auth as unknown as import("vitest").Mock).mockResolvedValue({
        user: { id: "user-1" },
      });

      (
        UserModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue({
        isActive: true,
        roles: ["role-1"],
        rolesVersion: 1,
      });

      (
        RoleModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue([{ permissions: ["table:read"] }]);

      await expect(requirePermission("audit:view")).rejects.toThrow(
        AuthorizationError,
      );
    });

    it("returns context if user has permission", async () => {
      (auth as unknown as import("vitest").Mock).mockResolvedValue({
        user: { id: "user-1" },
      });

      (
        UserModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue({
        isActive: true,
        roles: ["role-1"],
        rolesVersion: 1,
      });

      (
        RoleModel as unknown as { exec: import("vitest").Mock }
      ).exec.mockResolvedValue([{ permissions: ["audit:view"] }]);

      const result = await requirePermission("audit:view");
      expect(result.userId).toBe("user-1");
      expect(result.permissions.has("audit:view")).toBe(true);
    });
  });
});
