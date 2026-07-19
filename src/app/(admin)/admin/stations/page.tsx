import { requireAuthentication } from "@/server/auth/session";
import { requirePermission } from "@/server/auth/authorization";
import { getStations } from "@/server/admin/station-service";
import StationsClient from "./stations-client";

export const metadata = {
  title: "Stations | Admin",
};

export default async function StationsPage() {
  await requireAuthentication();
  await requirePermission("menu:manage");

  const initialStations = await getStations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stations</h1>
        <p className="text-muted-foreground mt-2">
          Manage preparation stations like Kitchen, Bar, or custom destinations.
        </p>
      </div>

      <StationsClient initialStations={initialStations} />
    </div>
  );
}
