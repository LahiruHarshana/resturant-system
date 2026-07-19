import { NextRequest, NextResponse } from "next/server";
import { updateZone } from "@/server/admin/table-service";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await updateZone(id, body);
    return NextResponse.json(result);
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
      { error: "Failed to update zone", details: err.message },
      { status: 500 },
    );
  }
}
