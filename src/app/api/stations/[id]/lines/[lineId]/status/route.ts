import { NextRequest, NextResponse } from "next/server";
import { authorizeStationAccess } from "@/server/stations/station-auth";
import { updateLineStatus } from "@/server/stations/station-queue-service";
import { UpdateLineStatusSchema } from "@/shared/station/schemas";
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> },
) {
  try {
    const { id, lineId } = await params;

    // 1. Authenticate & Authorize
    const { userId } = await authorizeStationAccess(id, "status");

    // 2. Parse & Validate Payload
    const body = await request.json();
    const result = UpdateLineStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.issues },
        { status: 400 },
      );
    }

    // 3. Update Status
    await updateLineStatus(id, lineId, result.data.status, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Station not found" ||
        error.message === "Line not found")
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Line status update error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
