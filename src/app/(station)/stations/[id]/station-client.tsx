"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  StationQueueDTO,
  StationQueueLineDTO,
  UpdateLineStatusDTO,
} from "../../../../shared/station/schemas";
import { useRealtimeChannel } from "../../../../components/realtime/use-channel";
import { useRealtimeConnection } from "../../../../components/realtime/provider";
import {
  LineCreatedEventSchema,
  LineStatusChangedEventSchema,
} from "../../../../shared/realtime/events";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { toast } from "sonner";
import { differenceInMinutes } from "date-fns";
import { useMemo, useEffect, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";

interface StationClientProps {
  stationId: string;
  stationName: string;
  stationType: string;
}

export function StationClient({
  stationId,
  stationName,
  stationType,
}: StationClientProps) {
  const queryClient = useQueryClient();
  const { connectionState } = useRealtimeConnection();

  // Local time for calculating ages
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // update every 30s
    return () => clearInterval(timer);
  }, []);

  const {
    data: queue,
    isLoading,
    isError,
    refetch,
  } = useQuery<StationQueueDTO>({
    queryKey: ["station-queue", stationId],
    queryFn: async () => {
      const res = await fetch(`/api/stations/${stationId}/queue`);
      if (!res.ok) {
        throw new Error("Failed to load queue");
      }
      return res.json();
    },
  });

  // Real-time hook for new lines
  useRealtimeChannel({
    channelName: `private-station-${stationId}`,
    eventName: "line.created.v1",
    schema: LineCreatedEventSchema,
    onEvent: () => {
      // Refresh the queue when new lines arrive
      queryClient.invalidateQueries({ queryKey: ["station-queue", stationId] });
      // Play a sound or show a toast
      toast.success("New order received!");
    },
  });

  // Real-time hook for status updates (from other displays/devices)
  useRealtimeChannel({
    channelName: `private-station-${stationId}`,
    eventName: "line.status-changed.v1",
    schema: LineStatusChangedEventSchema,
    onEvent: (event) => {
      queryClient.setQueryData(
        ["station-queue", stationId],
        (oldData: StationQueueDTO | undefined) => {
          if (!oldData) return oldData;
          const lineExists = oldData.lines.some((l) => l.id === event.id);
          if (!lineExists) {
            // If we don't have it, fetch it entirely
            queryClient.invalidateQueries({
              queryKey: ["station-queue", stationId],
            });
            return oldData;
          }

          // If it moved to READY and we only track NEW/PREPARING, filter it out
          if (
            event.status === "READY" ||
            event.status === "SERVED" ||
            event.status === "VOID"
          ) {
            return { lines: oldData.lines.filter((l) => l.id !== event.id) };
          }

          // Otherwise update status
          return {
            lines: oldData.lines.map((l) =>
              l.id === event.id ? { ...l, status: event.status } : l,
            ),
          };
        },
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      lineId,
      status,
    }: {
      lineId: string;
      status: UpdateLineStatusDTO["status"];
    }) => {
      const res = await fetch(
        `/api/stations/${stationId}/lines/${lineId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
      return res.json();
    },
    onMutate: async ({ lineId, status }) => {
      await queryClient.cancelQueries({
        queryKey: ["station-queue", stationId],
      });
      const previous = queryClient.getQueryData<StationQueueDTO>([
        "station-queue",
        stationId,
      ]);

      // Optimistic update
      queryClient.setQueryData(
        ["station-queue", stationId],
        (old: StationQueueDTO | undefined) => {
          if (!old) return old;
          if (status === "READY") {
            return { lines: old.lines.filter((l) => l.id !== lineId) };
          }
          return {
            lines: old.lines.map((l) =>
              l.id === lineId ? { ...l, status } : l,
            ),
          };
        },
      );

      return { previous };
    },
    onError: (err, _variables, context) => {
      toast.error(`Update failed: ${err.message}`);
      if (context?.previous) {
        queryClient.setQueryData(
          ["station-queue", stationId],
          context.previous,
        );
      }
    },
    onSettled: () => {
      // Invalidate to ensure server truth
      queryClient.invalidateQueries({ queryKey: ["station-queue", stationId] });
    },
  });

  const tickets = useMemo(() => {
    if (!queue) return [];

    const groups = new Map<string, StationQueueLineDTO[]>();
    for (const line of queue.lines) {
      const g = groups.get(line.ticketId) || [];
      g.push(line);
      groups.set(line.ticketId, g);
    }

    return Array.from(groups.values()).sort((a, b) => {
      // Sort tickets by oldest fired line
      const oldestA = a.reduce(
        (min, l) => (!min || (l.firedAt && l.firedAt < min) ? l.firedAt! : min),
        "",
      );
      const oldestB = b.reduce(
        (min, l) => (!min || (l.firedAt && l.firedAt < min) ? l.firedAt! : min),
        "",
      );
      return oldestA.localeCompare(oldestB);
    });
  }, [queue]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <h2 className="mb-4 text-xl font-bold">Error loading queue</h2>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{stationName}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {stationType} Display System
          </p>
        </div>
        <div className="flex items-center gap-4">
          {connectionState !== "connected" && (
            <Badge variant="destructive" className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" /> {connectionState}
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {tickets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <p className="text-2xl font-medium">Queue is empty</p>
            <p className="text-lg">Waiting for new orders...</p>
          </div>
        ) : (
          <div className="grid auto-rows-max grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {tickets.map((ticketLines) => {
              const ticketId = ticketLines[0]!.ticketId;
              const ticketNo = ticketLines[0]!.ticketNo;
              const tableLabel = ticketLines[0]!.tableLabel;

              // Find oldest line for aging
              const oldestLine = ticketLines.reduce((prev, curr) =>
                prev.firedAt && curr.firedAt && curr.firedAt < prev.firedAt
                  ? curr
                  : prev,
              );

              const minutesOld = oldestLine.firedAt
                ? differenceInMinutes(now, new Date(oldestLine.firedAt))
                : 0;

              // Age classes (configurable thresholds)
              let ageClass = "bg-card border-border shadow-sm";
              let headerClass = "bg-muted text-foreground border-b border-border";
              if (minutesOld >= 15) {
                ageClass = "bg-danger/5 border-danger shadow-sm"; // Urgent
                headerClass = "bg-danger text-danger-foreground border-b border-danger";
              } else if (minutesOld >= 10) {
                ageClass = "bg-warning/10 border-warning shadow-sm"; // Warning
                headerClass = "bg-warning text-warning-foreground border-b border-warning";
              }

              return (
                <Card
                  key={ticketId}
                  className={`flex flex-col overflow-hidden border-2 transition-all ${ageClass}`}
                >
                  <CardHeader
                    className={`p-4 ${headerClass} flex flex-row items-center justify-between space-y-0 pb-3`}
                  >
                    <div>
                      <CardTitle className="text-xl font-bold">
                        {tableLabel ? `Table ${tableLabel}` : "No Table"}
                      </CardTitle>
                      <p className="text-sm opacity-80">#{ticketNo}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black">{minutesOld}m</div>
                      <p className="text-xs font-medium tracking-wider uppercase opacity-80">
                        Age
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-1 p-0">
                    {ticketLines.map((line) => {
                      return (
                        <div
                          key={line.id}
                          className="border-b border-border p-4 transition-colors last:border-0 hover:bg-muted/30"
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex gap-3">
                              <span className="text-lg font-bold text-primary">
                                {line.quantity}x
                              </span>
                              <div>
                                <span className="text-lg font-bold text-foreground">
                                  {line.itemNameSnapshot}
                                </span>
                                {line.modifierSnapshots?.length > 0 && (
                                  <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                                    {line.modifierSnapshots.map(
                                      (mod: { nameSnapshot: string }, i) => (
                                        <li
                                          key={i}
                                          className="flex items-center before:mr-2 before:text-muted-foreground/60 before:content-['▹']"
                                        >
                                          {mod.nameSnapshot}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                )}
                                {line.note && (
                                  <p className="mt-2 rounded-md bg-warning/10 p-2 text-sm text-warning-foreground italic border border-warning/20">
                                    &quot;{line.note}&quot;
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            {line.status === "NEW" && (
                              <Button
                                size="lg"
                                className="h-14 w-full bg-primary text-lg font-bold text-primary-foreground hover:bg-primary/90"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    lineId: line.id,
                                    status: "PREPARING",
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                              >
                                Start Preparing
                              </Button>
                            )}
                            {line.status === "PREPARING" && (
                              <Button
                                size="lg"
                                className="h-14 w-full bg-success text-lg font-bold text-success-foreground hover:bg-success/90"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    lineId: line.id,
                                    status: "READY",
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                              >
                                Mark Ready
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
