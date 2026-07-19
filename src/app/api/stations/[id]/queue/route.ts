import { NextRequest, NextResponse } from "next/server";
import { authorizeStationAccess } from "@/server/stations/station-auth";
import { getStationQueue } from "@/server/stations/station-queue-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Auth Check
    await authorizeStationAccess(id, "read");

    // Fetch queue
    const queue = await getStationQueue(id);

    return NextResponse.json(queue);
  } catch (error) {
    if (error instanceof Error && error.message === "Station not found") {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }
    console.error("Queue fetch error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
