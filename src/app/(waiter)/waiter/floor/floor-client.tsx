"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, WifiOff } from "lucide-react";
import type { FloorZoneDTO, FloorTableDTO } from "@/shared/waiter/schemas";
import { TableCard } from "@/components/waiter/table-card";
import { OpenTicketSheet } from "@/components/waiter/open-ticket-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function FloorClient({ initialData }: { initialData: FloorZoneDTO[] }) {
  const router = useRouter();
  const [data, setData] = useState<FloorZoneDTO[]>(initialData);
  const [isOffline, setIsOffline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Table selection state
  const [selectedTable, setSelectedTable] = useState<FloorTableDTO | null>(
    null,
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const fetchFloor = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/waiter/tables");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const newData = await res.json();
      setData(newData);
      setIsOffline(false);
    } catch {
      setIsOffline(true);
      toast.error("You are offline. Cannot refresh floor.");
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchFloor();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchFloor]);

  const handleOpenTable = (table: FloorTableDTO) => {
    setSelectedTable(table);
    setIsSheetOpen(true);
  };

  const handleResumeTable = (table: FloorTableDTO) => {
    if (!table.currentTicketId) {
      toast.error("Table is occupied but has no active ticket.");
      fetchFloor();
      return;
    }
    router.push(`/waiter/tickets/${table.currentTicketId}`);
  };

  const handleConfirmOpen = async (guestCount: number) => {
    if (!selectedTable) return;

    const res = await fetch("/api/waiter/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableId: selectedTable.id,
        guestCount,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      toast.error(body.error || "Failed to open table");
      fetchFloor();
      return;
    }

    if (!body.created) {
      toast.info(
        "This table was opened by another staff member. The current ticket is now displayed.",
      );
    }

    // Prefetch for speed, then push
    router.push(`/waiter/tickets/${body.ticket.id}`);
  };

  if (!data.length) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center p-4 text-center">
        <h2 className="mb-2 text-xl font-bold">No Active Zones</h2>
        <p className="text-muted-foreground mb-4">
          There are currently no active zones or tables available to serve.
        </p>
        <Button onClick={fetchFloor} variant="outline">
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-safe flex min-h-screen w-full flex-col">
      {isOffline && (
        <div className="bg-destructive text-destructive-foreground sticky top-0 z-50 flex items-center justify-center p-2 text-sm font-medium">
          <WifiOff className="mr-2 h-4 w-4" />
          Offline - Check connection
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl flex-1 p-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Floor</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchFloor}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? "text-primary animate-spin" : "text-muted-foreground"}`}
            />
          </Button>
        </div>

        <Tabs defaultValue={data[0]?.zoneName} className="w-full">
          <TabsList className="bg-background/95 sticky top-2 z-40 mb-6 w-full justify-start overflow-x-auto border p-1 backdrop-blur">
            {data.map((zone) => (
              <TabsTrigger
                key={zone.zoneName}
                value={zone.zoneName}
                className="min-w-[100px]"
              >
                {zone.zoneName}
              </TabsTrigger>
            ))}
          </TabsList>

          {data.map((zone) => (
            <TabsContent
              key={zone.zoneName}
              value={zone.zoneName}
              className="mt-0"
            >
              {zone.tables.length === 0 ? (
                <div className="text-muted-foreground bg-muted/20 rounded-xl border border-dashed py-10 text-center">
                  No active tables in this zone.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {zone.tables.map((table) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      onOpen={handleOpenTable}
                      onResume={handleResumeTable}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <OpenTicketSheet
        table={selectedTable}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onConfirm={handleConfirmOpen}
      />
    </div>
  );
}
