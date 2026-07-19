import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/authorization";
import {
  getStationPerformance,
  getWaiterPerformance,
  getExceptionSummary,
} from "@/server/admin/report-service";
import { AuthorizationError } from "@/server/auth/errors";

export async function GET(request: Request) {
  try {
    await requirePermission("report:view");

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    if (!fromStr || !toStr) {
      return NextResponse.json(
        { error: "Missing date range" },
        { status: 400 },
      );
    }

    const from = new Date(fromStr);
    const to = new Date(toStr);

    const [stations, waiters, exceptions] = await Promise.all([
      getStationPerformance({ from, to }),
      getWaiterPerformance({ from, to }),
      getExceptionSummary({ from, to }),
    ]);

    return NextResponse.json({ stations, waiters, exceptions });
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
    console.error("Performance report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
