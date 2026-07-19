import { requirePermission } from "@/server/auth/authorization";
import { applyDiscount } from "@/server/cashier/billing-service";
import { ApplyDiscountRequestSchema } from "@/shared/cashier/schemas";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requirePermission("payment:create");
    const resolvedParams = await params;
    const ticketId = resolvedParams.id;

    const body = await req.json();
    const parsed = ApplyDiscountRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { amountMinor, idempotencyKey } = parsed.data;

    await applyDiscount(ticketId, amountMinor, session.userId, idempotencyKey);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && "status" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as { status: number }).status },
      );
    }
    console.error("PATCH /api/cashier/tickets/[id]/discount error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
