import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/server/db/connect";
import { RestaurantSettingsModel } from "@/server/db/models/restaurant-settings.model";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    await connectToDatabase();

    // Default values if no settings document exists yet
    const defaultSettings = {
      restaurantName: "Demo Restaurant",
      currency: "USD",
      currencyMinorDigits: 2,
      taxBps: 1000,
    };

    const settings = await RestaurantSettingsModel.findOne({}).lean();

    if (!settings) {
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json({
      restaurantName: settings.restaurantName,
      currency: settings.currency,
      currencyMinorDigits: settings.currencyMinorDigits,
      taxBps: settings.taxBps,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
