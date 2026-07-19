import { NextResponse } from "next/server";
import { removeOrderLine } from "@/server/waiter/order-service";

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; lineId: string }> },
) {
  try {
    const { id, lineId } = await props.params;
    const result = await removeOrderLine(id, lineId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    const msg = err.message || "";
    if (msg === "Unauthenticated") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    if (msg === "Unauthorized" || msg.includes("permission")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (msg === "Ticket not found" || msg === "Order line not found") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (
      msg.includes("Only OPEN tickets can be modified") ||
      msg.includes("already being prepared")
    ) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
