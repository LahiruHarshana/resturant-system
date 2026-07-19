import { NextResponse } from "next/server";
import { closeTicket } from "@/server/waiter/ticket-service";
import { z } from "zod";

const CloseTicketBodySchema = z.object({
  idempotencyKey: z.string().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = CloseTicketBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await closeTicket(id, parsed.data.idempotencyKey);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string };
    const err = error instanceof Error ? error : new Error(String(error));

    if (err.message.includes("Ticket not found")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    if (
      e.message?.includes("unauthorized") ||
      err.message.includes("Access denied")
    ) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    if (
      e.message?.includes("unauthenticated") ||
      err.message.includes("Authentication required")
    ) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (
      err.message.includes("Cannot close") ||
      err.message.includes("Only OPEN") ||
      err.message.includes("must be SERVED")
    ) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
