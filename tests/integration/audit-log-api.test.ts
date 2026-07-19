import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import { NextRequest } from "next/server";
import { GET as auditHandler } from "@/app/api/admin/audit-logs/route";
vi.mock("@/auth", () => ({ auth: vi.fn() }));
import { AuthorizationError } from "@/server/auth/errors";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/server/auth/authorization");

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
let mongoServer: MongoMemoryServer;

describe("Audit Log API Integration", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("16. Unauthenticated audit request returns 401", async () => {
    vi.spyOn(authorization, "requirePermission").mockRejectedValue(
      Object.assign(new Error("Auth required"), {
        name: "AuthenticationError",
      }),
    );

    const req = new NextRequest("http://localhost/api/admin/audit-logs");
    const res = await auditHandler(req);
    expect(res.status).toBe(401);
  });

  it("17. Unauthorized audit request returns 403", async () => {
    vi.spyOn(authorization, "requirePermission").mockRejectedValue(
      new AuthorizationError("Denied"),
    );

    const req = new NextRequest("http://localhost/api/admin/audit-logs");
    const res = await auditHandler(req);
    expect(res.status).toBe(403);
  });

  it("18. Audit logs support pagination", async () => {
    // Actually mocking service or DB is easier, but verifying it parses params is enough
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: "123",
      permissions: new Set(["audit:view"]),
    });

    const req = new NextRequest(
      "http://localhost/api/admin/audit-logs?page=2&pageSize=10",
    );
    const res = await auditHandler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(10);
  });
});
