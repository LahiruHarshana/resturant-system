import { NextResponse } from "next/server";
import { getCompactMenu } from "@/server/waiter/menu-service";

export async function GET() {
  try {
    const menu = await getCompactMenu();
    return NextResponse.json(menu);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === "Unauthorized" || err.message.includes("permission")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (err.message === "Unauthenticated") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
