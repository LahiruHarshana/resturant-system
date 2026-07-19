import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { GET } from "@/app/api/some-protected-api/route";
import * as authAuth from "@/server/auth/authorization";
import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";

describe("Protected API Route (Integration-like)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.spyOn(authAuth, "requirePermission").mockRejectedValueOnce(
      new AuthenticationError("Auth needed"),
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Auth needed");
  });

  it("returns 403 when authenticated but unauthorized", async () => {
    vi.spyOn(authAuth, "requirePermission").mockRejectedValueOnce(
      new AuthorizationError("Permission denied"),
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.error).toBe("Permission denied");
  });

  it("returns 200 when authorized", async () => {
    vi.spyOn(authAuth, "requirePermission").mockResolvedValueOnce({
      userId: "user-123",
      permissions: new Set(["audit:view"]),
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.message).toBe("Success");
    expect(json.user).toBe("user-123");
  });
});
