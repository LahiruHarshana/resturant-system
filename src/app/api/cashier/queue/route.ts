import { NextResponse } from "next/server";
import { getCashierQueue } from "@/server/cashier/queue-service";

export async function GET() {
  try {
    const result = await getCashierQueue();
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const e = error as { message?: string };
    const err = error instanceof Error ? error : new Error(String(error));

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

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
