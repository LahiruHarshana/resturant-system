import { NextRequest, NextResponse } from "next/server";
import {
  updateCategory,
  deactivateCategory,
  deleteCategory,
} from "@/server/admin/category-service";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await updateCategory(id, body);
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
    if (err.message.includes("not found")) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (err.message.includes("already exists")) {
      return NextResponse.json(
        { error: "Conflict", message: err.message },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const soft = url.searchParams.get("soft") === "true";

    if (soft) {
      const result = await deactivateCategory(id);
      return NextResponse.json(result);
    } else {
      const result = await deleteCategory(id);
      return NextResponse.json(result);
    }
  } catch (error: unknown) {
    const err = error as Error & { errors?: unknown };
    if (err.message.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message.includes("not found")) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (err.message.includes("referenced")) {
      return NextResponse.json(
        { error: "Conflict", message: err.message },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
