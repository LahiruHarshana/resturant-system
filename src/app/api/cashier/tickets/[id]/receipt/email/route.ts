import { requirePermission } from "@/server/auth/authorization";
import { sendReceiptEmail } from "@/server/cashier/receipt-service";
import { SendReceiptEmailRequestSchema } from "@/shared/cashier/schemas";
import { NextResponse } from "next/server";
import { requireAuthentication } from "@/server/auth/session";

export async function POST(
  req: Request,
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

    const body = await req.json();
    const parsed = SendReceiptEmailRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email, idempotencyKey } = parsed.data;

    const result = await sendReceiptEmail(
      ticketId,
      email,
      session.user.id,
      idempotencyKey,
    );

    return NextResponse.json(result);
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
    console.error("POST /api/cashier/tickets/[id]/receipt/email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
