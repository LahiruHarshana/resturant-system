import { NextRequest, NextResponse } from "next/server";
import { getZones, createZone } from "@/server/admin/table-service";

export async function GET() {
  try {
    const zones = await getZones();
    return NextResponse.json(zones);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message && err.message.includes("Permission denied"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (err.message && err.message.includes("Not authenticated"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createZone(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error & { errors?: unknown };
    if (err.name === "ZodError")
      return NextResponse.json(
        { error: "Validation Error", details: err.errors },
        { status: 400 },
      );
    if (err.message && err.message.includes("Permission denied"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (err.message && err.message.includes("Not authenticated"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message && err.message.includes("already exists"))
      return NextResponse.json(
        { error: "Conflict", message: err.message },
        { status: 409 },
      );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
