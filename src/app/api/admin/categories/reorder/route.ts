import { NextRequest, NextResponse } from "next/server";
import { reorderCategories } from "@/server/admin/category-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await reorderCategories(body);
    return NextResponse.json(result);
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
