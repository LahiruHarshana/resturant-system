import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { RoleModel } from "@/server/db/models/role.model";
import {
  createRole,
  updateRole,
  deleteRole,
} from "@/server/admin/role-service";
import mongoose from "mongoose";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Admin Core - Roles", () => {
  beforeEach(async () => {
    await startIntegrationDatabase();

    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: new mongoose.Types.ObjectId().toString(),
      permissions: new Set(),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
    await stopIntegrationDatabase();
  });

  it("20. should create a valid custom role", async () => {
    const res = await createRole({
      name: "Shift Lead",
      description: "Leads the shift",
      permissions: ["order:create", "table:read"],
    });

    expect(res.success).toBe(true);

    const role = await RoleModel.findById(res.roleId);
    expect(role?.name).toBe("shift lead");
    expect(role?.isSystem).toBe(false);
    expect(role?.permissions).toContain("order:create");
  });

  it("21. should reject creating a role with a reserved name", async () => {
    await expect(
      createRole({ name: "super_admin", description: "", permissions: [] }),
    ).rejects.toThrow(/Reserved role name/);
  });

  it("22. should prevent editing system roles", async () => {
    const sysRole = await RoleModel.create({
      name: "manager",
      isSystem: true,
      permissions: ["menu:manage"],
    });

    await expect(
      updateRole(sysRole._id.toString(), {
        name: "Manager updated",
        description: "",
        permissions: [],
      }),
    ).rejects.toThrow(/Cannot edit system roles/);
  });

  it("23. should prevent deleting system roles", async () => {
    const sysRole = await RoleModel.create({
      name: "kitchen",
      isSystem: true,
      permissions: ["line:read:kitchen"],
    });

    await expect(deleteRole(sysRole._id.toString())).rejects.toThrow(
      /Cannot delete system roles/,
    );
  });

  it("24. should allow editing and deleting custom roles", async () => {
    const customRole = await RoleModel.create({
      name: "custom_role",
      isSystem: false,
      permissions: [],
    });

    const updateRes = await updateRole(customRole._id.toString(), {
      name: "custom_role_updated",
      description: "",
      permissions: ["order:update"],
    });

    expect(updateRes.success).toBe(true);

    const updated = await RoleModel.findById(customRole._id);
    expect(updated?.name).toBe("custom_role_updated");

    const delRes = await deleteRole(customRole._id.toString());
    expect(delRes.success).toBe(true);

    const deleted = await RoleModel.findById(customRole._id);
    expect(deleted).toBeNull();
  });
});
