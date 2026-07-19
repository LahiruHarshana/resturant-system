import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/server/admin/settings-service";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error: unknown) {
    const err = error as Error & { errors?: unknown };
    if (err.message.includes("Permission denied"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (err.message.includes("Not authenticated"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await updateSettings(body);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error & { errors?: unknown };
    if (err && err.name === "ZodError")
      return NextResponse.json(
        { error: "Validation Error", details: err.errors },
        { status: 400 },
      );
    if (err.message.includes("Permission denied"))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (err.message.includes("Not authenticated"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
