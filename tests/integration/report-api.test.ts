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
import { GET as salesHandler } from "@/app/api/admin/reports/sales/route";
vi.mock("@/auth", () => ({ auth: vi.fn() }));
import { AuthorizationError } from "@/server/auth/errors";
import * as authorization from "@/server/auth/authorization";

vi.mock("@/server/auth/authorization");
vi.mock("@/server/auth/session");

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
let mongoServer: MongoMemoryServer;

describe("Report API Integration", () => {
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

  it("2. Unauthenticated report request returns 401", async () => {
    vi.spyOn(authorization, "requirePermission").mockRejectedValue(
      Object.assign(new Error("Auth required"), {
        name: "AuthenticationError",
      }),
    );

    const req = new NextRequest(
      "http://localhost/api/admin/reports/sales?from=2021-01-01&to=2022-01-01",
    );
    const res = await salesHandler(req);
    expect(res.status).toBe(401);
  });

  it("3. Unauthorized report request returns 403", async () => {
    vi.spyOn(authorization, "requirePermission").mockRejectedValue(
      new AuthorizationError("Denied"),
    );

    const req = new NextRequest(
      "http://localhost/api/admin/reports/sales?from=2021-01-01&to=2022-01-01",
    );
    const res = await salesHandler(req);
    expect(res.status).toBe(403);
  });

  it("4. Invalid date range returns 400", async () => {
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: "123",
      permissions: new Set(["report:view"]),
    });

    const req = new NextRequest("http://localhost/api/admin/reports/sales"); // Missing params
    const res = await salesHandler(req);
    expect(res.status).toBe(400);
  });
});
