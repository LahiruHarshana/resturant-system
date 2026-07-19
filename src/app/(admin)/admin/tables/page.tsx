import { requireAuthentication } from "@/server/auth/session";
import { requirePermission } from "@/server/auth/authorization";
import { getTables, getZones } from "@/server/admin/table-service";
import TablesClient from "./tables-client";

export const metadata = {
  title: "Tables | Admin",
};

export default async function TablesPage() {
  await requireAuthentication();
  await requirePermission("table:manage");

  const [rawTables, initialZones] = await Promise.all([
    getTables(),
    getZones(),
  ]);

  const initialTables = rawTables.map((t) => ({
    ...t,
    currentTicketId: t.currentTicketId
      ? t.currentTicketId.toString()
      : undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Zones & Tables</h1>
        <p className="text-muted-foreground mt-2">
          Configure restaurant zones and their tables.
        </p>
      </div>

      <TablesClient initialTables={initialTables} initialZones={initialZones} />
    </div>
  );
}
