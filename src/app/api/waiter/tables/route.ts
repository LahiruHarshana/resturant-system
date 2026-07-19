import { NextRequest, NextResponse } from "next/server";
import { getFloorTables } from "@/server/waiter/floor-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const zone = searchParams.get("zone") || undefined;
    const status = searchParams.get("status") || undefined;

    const data = await getFloorTables(zone, status);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message?.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err.message?.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
