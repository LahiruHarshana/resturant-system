import { NextRequest, NextResponse } from "next/server";
import { getReadyLines } from "@/server/waiter/order-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const lines = await getReadyLines(id);

    return NextResponse.json({
      lines: lines.map((l) => ({
        id: l._id.toString(),
        itemNameSnapshot: l.nameSnapshot,
        quantity: l.quantity,
        note: l.note,
        status: l.status,
      })),
    });
  } catch (error) {
    console.error("Get ready lines error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
