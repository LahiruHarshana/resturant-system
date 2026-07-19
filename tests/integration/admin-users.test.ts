import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { UserModel } from "@/server/db/models/user.model";
import { RoleModel } from "@/server/db/models/role.model";
import { createUser, updateUser } from "@/server/admin/user-service";
import mongoose from "mongoose";
import * as authorization from "@/server/auth/authorization";
import bcrypt from "bcryptjs";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Admin Core - Users", () => {
  let adminId: string;
  let roleId: string;

  beforeEach(async () => {
    await startIntegrationDatabase();

    adminId = new mongoose.Types.ObjectId().toString();

    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: adminId,
      permissions: new Set(),
    } as unknown as Awaited<
      ReturnType<typeof authorization.requirePermission>
    >);

    const role = await RoleModel.create({
      name: "server",
      permissions: [],
      isSystem: false,
    });
    roleId = role._id.toString();

    await UserModel.create({
      _id: adminId,
      name: "Admin User",
      email: "admin@example.com",
      roles: [roleId],
      passwordHash: "hash",
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearIntegrationDatabase();
    await stopIntegrationDatabase();
  });

  it("25. should create a user and return generated credentials", async () => {
    const res = await createUser({
      name: "New Staff",
      email: "staff@example.com",
      phone: "123",
      roles: [roleId],
      isActive: true,
      pinEnabled: true,
      resetPin: false,
      resetPassword: false,
    });

    expect(res.success).toBe(true);
    expect(res.tempPassword).toBeDefined();
    expect(res.tempPin).toBeDefined();
    expect(res.tempPin?.length).toBe(4);

    const user = await UserModel.findById(res.userId).select(
      "+passwordHash +pinHash",
    );
    expect(user?.email).toBe("staff@example.com");
    expect(user?.pinEnabled).toBe(true);

    // Verify hashes
    const passwordMatch = await bcrypt.compare(
      res.tempPassword!,
      user!.passwordHash,
    );
    expect(passwordMatch).toBe(true);

    const pinMatch = await bcrypt.compare(res.tempPin!, user!.pinHash!);
    expect(pinMatch).toBe(true);
  });

  it("26. should reject creating a user with an existing email", async () => {
    await expect(
      createUser({
        name: "Copy",
        email: "admin@example.com", // existing
        phone: "",
        roles: [roleId],
        isActive: true,
        pinEnabled: false,
        resetPin: false,
        resetPassword: false,
      }),
    ).rejects.toThrow(/already exists/);
  });

  it("27. should allow resetting password and PIN", async () => {
    const createRes = await createUser({
      name: "Test",
      email: "test@example.com",
      phone: "",
      roles: [roleId],
      isActive: true,
      pinEnabled: true,
      resetPin: false,
      resetPassword: false,
    });

    const oldUser = await UserModel.findById(createRes.userId).select(
      "+passwordHash +pinHash",
    );

    const updateRes = await updateUser(createRes ? createRes.userId : adminId, {
      name: "Test",
      email: "test@example.com",
      phone: "",
      roles: [roleId],
      isActive: true,
      pinEnabled: true,
      resetPassword: true,
      resetPin: true,
    });

    expect(updateRes.tempPassword).toBeDefined();
    expect(updateRes.tempPin).toBeDefined();

    const newUser = await UserModel.findById(createRes.userId).select(
      "+passwordHash +pinHash +rolesVersion",
    );

    expect(newUser!.passwordHash).not.toBe(oldUser!.passwordHash);
    expect(newUser!.pinHash).not.toBe(oldUser!.pinHash);
  });

  it("28. should prevent deactivating own account", async () => {
    await expect(
      updateUser(adminId, {
        name: "Admin User",
        email: "admin@example.com",
        phone: "",
        roles: [roleId],
        isActive: false, // Trying to deactivate self
        pinEnabled: false,
        resetPin: false,
        resetPassword: false,
      }),
    ).rejects.toThrow(/cannot deactivate your own account/);
  });

  it("29. should increment rolesVersion on role change", async () => {
    const role2 = await RoleModel.create({
      name: "kitchen",
      permissions: [],
      isSystem: false,
    });

    const createRes = await createUser({
      name: "Test",
      email: "test2@example.com",
      phone: "",
      roles: [roleId],
      isActive: true,
      pinEnabled: false,
      resetPin: false,
      resetPassword: false,
    });

    const oldUser = await UserModel.findById(createRes.userId);
    const oldVersion = oldUser!.rolesVersion;

    await updateUser(createRes.userId, {
      name: "Test",
      email: "test2@example.com",
      phone: "",
      roles: [roleId, role2._id.toString()], // Changed roles
      isActive: true,
      pinEnabled: false,
      resetPin: false,
      resetPassword: false,
    });

    const newUser = await UserModel.findById(createRes.userId);
    expect(newUser!.rolesVersion).toBeGreaterThan(oldVersion);
  });
});
