import { NextResponse } from "next/server";
import { addOrderLines, getOrderLines } from "@/server/waiter/order-service";
import { ZodError } from "zod";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const lines = await getOrderLines(id);
    return NextResponse.json({ lines });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "Ticket not found") {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const result = await addOrderLines(id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.issues },
        { status: 400 },
      );
    }
    const err = error as Error;
    const msg = err.message || "";
    if (msg === "Unauthenticated") {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    if (msg === "Unauthorized" || msg.includes("permission")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (msg === "Ticket not found") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg.includes("Only OPEN tickets can be modified")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (
      msg.includes("is not available") ||
      msg.includes("Unknown modifier") ||
      msg.includes("Invalid option") ||
      msg.includes("Not enough selections") ||
      msg.includes("Too many selections")
    ) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
