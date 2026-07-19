import { requirePermission } from "@/server/auth/authorization";
import { recordPayment } from "@/server/cashier/billing-service";
import { RecordPaymentRequestSchema } from "@/shared/cashier/schemas";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("payment:create");
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const body = await req.json();
    const parsed = RecordPaymentRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { method, tenderedMinor, idempotencyKey } = parsed.data;

    const result = await recordPayment({
      ticketId,
      method,
      tenderedMinor,
      idempotencyKey,
      actorUserId: session.userId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && "status" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { status: number }).status },
      );
    }
    console.error("POST /api/cashier/tickets/[id]/pay error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
