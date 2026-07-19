import { requirePermission } from "@/server/auth/authorization";
import { calculateBill } from "@/server/cashier/billing-service";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("payment:create");

    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const bill = await calculateBill(ticketId);

    return NextResponse.json(bill);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "TICKET_NOT_FOUND") {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (error instanceof Error && "status" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { status: number }).status },
      );
    }
    console.error("GET /api/cashier/tickets/[id]/bill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
