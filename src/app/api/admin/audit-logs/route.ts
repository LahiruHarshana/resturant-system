import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/authorization";
import { getAuditLogs } from "@/server/admin/audit-log-service";
import { AuthorizationError } from "@/server/auth/errors";

export async function GET(request: Request) {
  try {
    await requirePermission("audit:view");

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const pageStr = searchParams.get("page");
    const pageSizeStr = searchParams.get("pageSize");
    const action = searchParams.get("action");
    const actorId = searchParams.get("actorId");

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : undefined;

    const data = await getAuditLogs({
      from,
      to,
      page,
      pageSize,
      action: action || undefined,
      actorId: actorId || undefined,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    if (
      error instanceof AuthorizationError ||
      err.name === "AuthenticationError"
    ) {
      return NextResponse.json(
        { error: err.message },
        { status: err.name === "AuthenticationError" ? 401 : 403 },
      );
    }
    if (err.name === "ApplicationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Audit log error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
