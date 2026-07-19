import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/authorization";
import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";

export async function GET() {
  try {
    const { userId } = await requirePermission("audit:view");
    return NextResponse.json({ message: "Success", user: userId });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
