import { NextResponse } from "next/server";
import { markLineServed } from "@/server/waiter/order-service";
import { z } from "zod";
import { requirePermission } from "@/server/auth/authorization";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> },
) {
  try {
    await requirePermission("order:update");
    const { id, lineId } = await params;

    const body = await request.json();

    const result = await markLineServed(id, lineId, body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Mark line served error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.issues },
        { status: 400 },
      );
    }

    if (
      message.includes("Invalid transition") ||
      message.includes("Cannot update line")
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("not OPEN")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (
      message.includes("Authentication required") ||
      message.includes("Unauthenticated")
    ) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (
      message.includes("Permission denied") ||
      message.includes("unauthorized") ||
      message === "Missing authorization context"
    ) {
      // The authorization context middleware might throw these, or requirePermission
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
