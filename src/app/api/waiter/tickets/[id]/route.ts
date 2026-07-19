import { NextRequest, NextResponse } from "next/server";
import { getTicketShell } from "@/server/waiter/ticket-service";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const data = await getTicketShell(id);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message?.includes("Permission denied")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err.message?.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message?.includes("Ticket not found")) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
