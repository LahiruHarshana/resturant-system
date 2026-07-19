import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { UserModel, RoleModel, AuditLogModel } from "@/server/db/models";
import {
  updateRolePermissions,
  assignRolesToUser,
  removeRolesFromUser,
} from "@/server/auth/role-service";
import * as authAuth from "@/server/auth/authorization";

let mongoServer: MongoMemoryServer;

// Mock requirePermission to bypass auth check and simulate a user with required permissions
vi.spyOn(authAuth, "requirePermission").mockImplementation(
  async (permission) => {
    return {
      userId: new mongoose.Types.ObjectId().toString(),
      permissions: new Set([permission]),
    };
  },
);

describe("Role Mutation Service (Integration)", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("updates role permissions and increments rolesVersion for affected users", async () => {
    const role = await RoleModel.create({
      name: "custom_role",
      isSystem: false,
      permissions: ["table:read"],
    });

    const user = await UserModel.create({
      name: "Role User",
      email: "roleuser@example.com",
      passwordHash: "hash",
      roles: [role._id],
      rolesVersion: 1,
    });

    await updateRolePermissions(role._id.toString(), [
      "table:read",
      "audit:view",
    ]);

    const updatedRole = await RoleModel.findById(role._id);
    expect(updatedRole?.permissions).toContain("audit:view");

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser?.rolesVersion).toBe(2);

    const auditLog = await AuditLogModel.findOne({
      action: "UPDATE_ROLE_PERMISSIONS",
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.entityId).toBe(role._id.toString());
  });

  it("assigns roles to user and increments rolesVersion", async () => {
    const role1 = await RoleModel.create({
      name: "assign_role_1",
      isSystem: false,
      permissions: [],
    });

    const user = await UserModel.create({
      name: "Assign User",
      email: "assignuser@example.com",
      passwordHash: "hash",
      roles: [],
      rolesVersion: 1,
    });

    await assignRolesToUser(user._id.toString(), [role1._id.toString()]);

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser?.rolesVersion).toBe(2);
    expect(updatedUser?.roles.length).toBe(1);

    const auditLog = await AuditLogModel.findOne({ action: "ASSIGN_ROLES" });
    expect(auditLog).toBeDefined();
  });

  it("removes roles from user and increments rolesVersion", async () => {
    const role1 = await RoleModel.create({
      name: "remove_role_1",
      isSystem: false,
      permissions: [],
    });

    const user = await UserModel.create({
      name: "Remove User",
      email: "removeuser@example.com",
      passwordHash: "hash",
      roles: [role1._id],
      rolesVersion: 2,
    });

    await removeRolesFromUser(user._id.toString(), [role1._id.toString()]);

    const updatedUser = await UserModel.findById(user._id);
    expect(updatedUser?.rolesVersion).toBe(3);
    expect(updatedUser?.roles.length).toBe(0);

    const auditLog = await AuditLogModel.findOne({ action: "REMOVE_ROLES" });
    expect(auditLog).toBeDefined();
  });
});
