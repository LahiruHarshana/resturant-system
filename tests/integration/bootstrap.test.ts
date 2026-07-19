import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import {
  startIntegrationDatabase,
  stopIntegrationDatabase,
  clearIntegrationDatabase,
} from "../support/database";
import { bootstrapAdmin } from "@/server/auth/bootstrap-admin";
import { UserModel, RoleModel } from "@/server/db/models";

// Mock process.exit
const mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`process.exit: ${code}`);
});

// Mock console to keep tests clean
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

describe("Bootstrap Admin", () => {
  beforeAll(async () => {
    await startIntegrationDatabase();
  });

  afterAll(async () => {
    await stopIntegrationDatabase();
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  beforeEach(async () => {
    await clearIntegrationDatabase();
    process.env.BOOTSTRAP_ADMIN_NAME = "Super Admin";
    process.env.BOOTSTRAP_ADMIN_EMAIL = "super@example.com";
    process.env.BOOTSTRAP_ADMIN_PASSWORD = "StrongPassword123!";

    // Seed the super_admin role
    await RoleModel.create({
      name: "super_admin",
      permissions: ["*"],
      isSystem: true,
    });
  });

  it("should create a super admin user successfully", async () => {
    await expect(bootstrapAdmin()).rejects.toThrow("process.exit: 0");

    const user = await UserModel.findOne({ email: "super@example.com" });
    expect(user).toBeDefined();
    expect(user?.name).toBe("Super Admin");
    expect(user?.roles).toHaveLength(1);
    expect(user?.sessionVersion).toBe(1);
  });

  it("should fail if password is too short", async () => {
    process.env.BOOTSTRAP_ADMIN_PASSWORD = "short";

    await expect(bootstrapAdmin()).rejects.toThrow("process.exit: 1");

    const user = await UserModel.findOne({ email: "super@example.com" });
    expect(user).toBeNull();
  });

  it("should be idempotent (running twice does not create duplicates)", async () => {
    await expect(bootstrapAdmin()).rejects.toThrow("process.exit: 0");
    await expect(bootstrapAdmin()).rejects.toThrow("process.exit: 0");

    const users = await UserModel.find({ email: "super@example.com" });
    expect(users).toHaveLength(1); // Still only one
  });
});
