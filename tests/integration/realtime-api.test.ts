import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "../../src/app/api/realtime/auth/route";
import * as authorization from "../../src/server/auth/authorization";
import { auth } from "@/auth";
import { __resetRealTimeProviderForTest } from "@/server/realtime";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Realtime Auth Route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetRealTimeProviderForTest();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const req = new Request("http://localhost/api/realtime/auth", {
      method: "POST",
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  it("returns 400 when socket_id or channel_name is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", permissions: [] },
    } as never);
    const formData = new FormData();
    const req = new Request("http://localhost/api/realtime/auth", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
  });

  it("returns 400 when channel name is unsafe", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", permissions: [] },
    } as never);
    const formData = new FormData();
    formData.append("socket_id", "123.456");
    formData.append("channel_name", "private-station-@#$%");

    const req = new Request("http://localhost/api/realtime/auth", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
  });

  it("returns 403 when user lacks permission for station channel", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", permissions: [] },
    } as never);
    vi.spyOn(authorization, "requirePermission").mockRejectedValue(
      new Error("Unauthorized"),
    );

    const formData = new FormData();
    formData.append("socket_id", "123.456");
    formData.append("channel_name", "private-station-123");

    const req = new Request("http://localhost/api/realtime/auth", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(403);
  });

  it("returns 200 success with Test auth signature when authorized", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", permissions: ["table:read"] },
    } as never);
    vi.spyOn(authorization, "requirePermission").mockResolvedValue({
      userId: "user-1",
      permissions: new Set(["table:read"]),
    } as never);

    const formData = new FormData();
    formData.append("socket_id", "123.456");
    formData.append("channel_name", "private-station-123");

    const req = new Request("http://localhost/api/realtime/auth", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ auth: "test-auth-signature" });
  });

  it("allows private-user channel if user id matches", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", permissions: [] },
    } as never);

    const formData = new FormData();
    formData.append("socket_id", "123.456");
    formData.append("channel_name", "private-user-user-123");

    const req = new Request("http://localhost/api/realtime/auth", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
  });

  it("rejects private-user channel if user id does not match", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", permissions: [] },
    } as never);

    const formData = new FormData();
    formData.append("socket_id", "123.456");
    formData.append("channel_name", "private-user-hacker-456");

    const req = new Request("http://localhost/api/realtime/auth", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(403);
  });
});
