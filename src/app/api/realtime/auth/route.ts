import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRealTimeProvider } from "@/server/realtime";
import { PusherRealTimeProvider } from "@/server/realtime/pusher";
import { requirePermission } from "@/server/auth/authorization";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.formData();
    const socketId = data.get("socket_id")?.toString();
    const channel = data.get("channel_name")?.toString();

    if (!socketId || !channel) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Sanitize and validate channel name (only allow alphanumeric, dashes, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(channel)) {
      return NextResponse.json(
        { error: "Invalid channel name" },
        { status: 400 },
      );
    }

    // Determine required permissions based on channel prefix
    let authorized = false;

    try {
      if (
        channel.startsWith("private-station-") ||
        channel.startsWith("private-table-")
      ) {
        // Broad permission for any station/table for foundation.
        // Real fine-grained read permissions per station can be added in Guide 14.
        await requirePermission("table:read");
        authorized = true;
      } else if (channel === "private-cashier") {
        await requirePermission("table:read");
        authorized = true;
      } else if (channel === "private-admin") {
        await requirePermission("report:view");
        authorized = true;
      } else if (channel.startsWith("private-user-")) {
        const userId = channel.replace("private-user-", "");
        if (session.user.id === userId) {
          authorized = true;
        }
      }
    } catch {
      // Permission rejected
      authorized = false;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const provider = getRealTimeProvider();

    // Only Pusher supports `.authenticate`. Test provider won't need real client auth in tests.
    if (provider instanceof PusherRealTimeProvider) {
      const authResponse = provider.authenticate(socketId, channel, {
        user_id: session.user.id,
      });
      return NextResponse.json(authResponse);
    }

    // Fallback for Test provider
    return NextResponse.json({ auth: "test-auth-signature" });
  } catch (error) {
    console.error("[RealTime Auth] Error authenticating channel:", error);
    // Avoid exposing raw provider errors
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
