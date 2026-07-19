import { NextRequest, NextResponse } from "next/server";
import { getStations, createStation } from "@/server/admin/station-service";

export async function GET() {
  try {
    const stations = await getStations();
    return NextResponse.json(stations);
  } catch (error: unknown) {
    const err = error as Error & { errors?: unknown };
    if (err.message.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createStation(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error & { errors?: unknown };
    if (err && err.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation Error", details: err.errors },
        { status: 400 },
      );
    }
    if (err.message.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
