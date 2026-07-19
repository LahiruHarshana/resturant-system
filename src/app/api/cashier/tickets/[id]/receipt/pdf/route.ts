import { requirePermission } from "@/server/auth/authorization";
import { generateReceiptPdf } from "@/server/cashier/receipt-service";
import { NextResponse } from "next/server";
import { requireAuthentication } from "@/server/auth/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("receipt:print");
    const session = await requireAuthentication();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const pdfBuffer = await generateReceiptPdf(ticketId, session.user.id);

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt-${ticketId}.pdf"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "TICKET_NOT_FOUND") {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "TICKET_NOT_PAID") {
      return NextResponse.json(
        { error: "Ticket must be paid to generate a receipt" },
        { status: 409 },
      );
    }
    if (error instanceof Error && "status" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { status: number }).status },
      );
    }
    console.error("GET /api/cashier/tickets/[id]/receipt/pdf error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
