import { NextRequest, NextResponse } from "next/server";
import { openTicketForTable } from "@/server/waiter/ticket-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await openTicketForTable(body);

    // We return 201 for creation and 200 for resumption. Wait, 201 is fine for both
    // per HTTP semantics since the document exists (and we return it).
    // Let's use 201 for created, 200 for resumed (created: false).
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error: unknown) {
    const err = error as Error & { name?: string; errors?: unknown };
    if (err.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation Error", details: err.errors },
        { status: 400 },
      );
    }
    if (err.message?.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err.message?.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      err.message?.includes("Table not found") ||
      err.message?.includes("Zone is inactive") ||
      err.message?.includes("Table is inactive")
    ) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
