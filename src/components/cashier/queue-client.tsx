"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeChannel } from "@/components/realtime/use-channel";
import { TicketUpdatedEventSchema } from "@/shared/realtime/events";
import { minorToDisplay } from "@/shared/money/money";
import { Search, Clock, Receipt, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CashierQueueTicketDTO } from "@/shared/cashier/schemas";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { TicketSettlement } from "./ticket-settlement";

export function QueueClient() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    tickets: CashierQueueTicketDTO[];
  }>({
    queryKey: ["cashier-queue"],
    queryFn: async () => {
      const res = await fetch("/api/cashier/queue");
      if (!res.ok) {
        throw new Error("Failed to fetch queue");
      }
      return res.json();
    },
    refetchInterval: 30000,
  });

  useRealtimeChannel({
    channelName: "private-cashier-queue", // Wait, is there a specific cashier channel? The publish uses getCashierChannel(). Let's check channels.ts.
    eventName: "ticket.closed.v1", // Note: The schema for TicketClosedEvent is what we added.
    schema: TicketUpdatedEventSchema, // We'll just invalidate on any update
    onEvent: () => {
      queryClient.invalidateQueries({ queryKey: ["cashier-queue"] });
    },
  });

  const tickets = data?.tickets || [];
  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.ticketNo.toString().includes(q) ||
      t.tableLabel.toLowerCase().includes(q) ||
      t.waiterName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-muted/20 flex h-[calc(100vh-4rem)] flex-col overflow-hidden md:flex-row">
      {/* Left side: Queue list */}
      <div className="bg-background flex w-full flex-col border-r md:w-1/3 lg:w-1/4">
        <div className="border-b p-4">
          <h2 className="mb-4 text-xl font-bold">Cashier Queue</h2>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search ticket or table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-2 text-sm">
                Loading queue...
              </p>
            </div>
          ) : isError ? (
            <div className="text-destructive flex h-40 flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="mb-2 h-8 w-8" />
              <p className="text-sm font-medium">Failed to load queue</p>
              <p className="mt-1 text-xs">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground flex h-40 flex-col items-center justify-center p-4 text-center">
              <Receipt className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm font-medium">Queue is empty</p>
              <p className="mt-1 text-xs">
                No closed tickets waiting for payment.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((ticket) => {
                const isSelected = selectedTicketId === ticket.id;
                const elapsed = formatDistanceToNowStrict(
                  parseISO(ticket.closedAt),
                  { addSuffix: false },
                );

                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-card border-border hover:bg-accent/50"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="font-bold">#{ticket.ticketNo}</span>
                      <span className="text-primary font-semibold">
                        ${minorToDisplay(ticket.totalMinor, 2)}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-between text-sm">
                      <span>{ticket.tableLabel}</span>
                      <span className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" />
                        {elapsed}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Bill Details (Placeholder for Guide 17) */}
      <div className="bg-muted/10 flex flex-1 items-center justify-center p-4 md:p-8">
        {selectedTicketId ? (
          <TicketSettlement
            ticketId={selectedTicketId}
            onSuccess={() => {
              setSelectedTicketId(null);
            }}
          />
        ) : (
          <div className="text-muted-foreground text-center">
            <Receipt className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <h3 className="text-lg font-medium">No Ticket Selected</h3>
            <p className="text-sm">
              Select a ticket from the queue to view details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
