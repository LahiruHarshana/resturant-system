import { requireAuthentication } from "@/server/auth/session";
import { requirePermission } from "@/server/auth/authorization";
import { getSettings } from "@/server/admin/settings-service";
import SettingsClient from "./settings-client";

export const metadata = {
  title: "Settings | Admin",
};

export default async function SettingsPage() {
  await requireAuthentication();
  await requirePermission("settings:manage");

  const initialSettings = await getSettings();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Restaurant Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure core global settings, currency, and aging thresholds.
        </p>
      </div>

      <SettingsClient
        initialSettings={
          initialSettings as import("@/shared/contracts/restaurant-settings").RestaurantSettings
        }
      />
    </div>
  );
}
