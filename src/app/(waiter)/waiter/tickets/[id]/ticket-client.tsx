"use client";

import { useState } from "react";

import { useRealtimeChannel } from "@/components/realtime/use-channel";
import { LineStatusChangedEventSchema } from "@/shared/realtime/events";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, Clock, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import type { TicketDTO, WaiterMenuDTO } from "@/shared/waiter/schemas";
import { ComposerCategoryTabs } from "@/components/waiter/composer-category-tabs";
import { ComposerItemGrid } from "@/components/waiter/composer-item-grid";
import { ItemCustomizationSheet } from "@/components/waiter/item-customization-sheet";
import { ComposerCartDrawer } from "@/components/waiter/composer-cart-drawer";
import { useOrderCart } from "@/hooks/use-order-cart";

interface TicketClientProps {
  initialTicket: TicketDTO;
  menu: WaiterMenuDTO;
}

interface ReadyLine {
  id: string;
  itemNameSnapshot: string;
  quantity: number;
  note?: string;
  status: string;
}

export function TicketClient({ initialTicket, menu }: TicketClientProps) {
  const [ticket, setTicket] = useState<TicketDTO>(initialTicket);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    menu.categories[0]?.id || "",
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartItems = useOrderCart(
    (state) => state.itemsByTicket[ticket.id]
  ) || [];

  const elapsed = formatDistanceToNowStrict(parseISO(ticket.openedAt), {
    addSuffix: false,
  });

  const selectedItem = selectedItemId
    ? menu.items.find((i) => i.id === selectedItemId)
    : undefined;

  const queryClient = useQueryClient();

  const { data: readyLinesData } = useQuery({
    queryKey: ["ready-lines", ticket.id],
    queryFn: async () => {
      const res = await fetch(`/api/waiter/tickets/${ticket.id}/ready-lines`);
      if (!res.ok) throw new Error("Failed to fetch ready lines");
      return res.json();
    },
    refetchInterval: 30000, // Poll occasionally just in case realtime drops
  });

  const readyLines = readyLinesData?.lines || [];

  useRealtimeChannel({
    channelName: ticket.tableId ? `private-table-${ticket.tableId}` : "",
    eventName: "line.status-changed.v1",
    schema: LineStatusChangedEventSchema,
    onEvent: (event) => {
      if (event.status === "READY" && event.previousStatus !== "READY") {
        toast.success("An order item is ready for pickup!", {
          icon: <BellRing className="h-5 w-5 text-emerald-500" />,
        });
        if (typeof window !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate([200, 100, 200]);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_vibErr) {}
        }
      }

      // Invalidate to fetch fresh lines
      queryClient.invalidateQueries({ queryKey: ["ready-lines", ticket.id] });
    },
  });

  const markServedMutation = useMutation({
    mutationFn: async (lineId: string) => {
      const res = await fetch(
        `/api/waiter/tickets/${ticket.id}/lines/${lineId}/served`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
        },
      );
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ready-lines", ticket.id] });
    },
    onError: () => {
      toast.error("Failed to mark served");
    },
  });

  const totalCartQuantity = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );

  return (
    <div className="bg-muted/20 pb-safe flex min-h-screen flex-col">
      <header className="bg-background/95 sticky top-0 z-30 flex items-center justify-between border-b p-4 backdrop-blur">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" asChild className="mr-2 -ml-2">
            <Link href="/waiter/floor">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl leading-none font-bold">
              Ticket #{ticket.ticketNo}
            </h1>
            <div className="text-muted-foreground mt-1 flex items-center text-sm">
              <span className="text-foreground mr-2 font-medium">
                Table: {ticket.tableLabel || ticket.tableId}
              </span>
              <Users className="mr-1 h-3.5 w-3.5" /> {ticket.guestCount}
              <span className="mx-2">•</span>
              <Clock className="mr-1 h-3.5 w-3.5" /> {elapsed}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-semibold">
            {ticket.status}
          </div>
        </div>
      </header>

      {readyLines.length > 0 && (
        <div className="animate-in slide-in-from-top-2 border-b border-emerald-900/30 bg-emerald-950/20 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BellRing className="h-5 w-5 animate-pulse text-emerald-500" />
            <h2 className="text-sm font-bold tracking-wider text-emerald-500 uppercase">
              Ready for Pickup ({readyLines.length})
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {readyLines.map((line: ReadyLine) => (
              <div
                key={line.id}
                className="bg-background flex items-center justify-between rounded-md border border-emerald-900/20 p-3 shadow-sm"
              >
                <div className="flex flex-col">
                  <span className="text-foreground font-bold">
                    <span className="mr-2 text-emerald-600">
                      {line.quantity}x
                    </span>
                    {line.itemNameSnapshot}
                  </span>
                  {line.note && (
                    <span className="text-muted-foreground mt-1 text-xs">
                      &quot;{line.note}&quot;
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => markServedMutation.mutate(line.id)}
                  disabled={markServedMutation.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Served
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-background sticky top-[73px] z-20 border-b">
        <ComposerCategoryTabs
          categories={menu.categories}
          activeId={activeCategoryId}
          onChange={setActiveCategoryId}
        />
      </div>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {ticket.status !== "OPEN" ? (
          <div className="text-muted-foreground flex h-40 flex-col items-center justify-center">
            Ticket is {ticket.status}. No further changes can be made.
          </div>
        ) : menu.items.length === 0 ? (
          <div className="text-muted-foreground flex h-40 flex-col items-center justify-center">
            No items available.
          </div>
        ) : (
          <ComposerItemGrid
            items={menu.items.filter((i) => i.categoryId === activeCategoryId)}
            onSelect={(id) => setSelectedItemId(id)}
          />
        )}
      </main>

      {/* Cart Summary Bar */}
      <div className="bg-background pb-safe sticky bottom-0 z-30 border-t p-4 shadow-lg">
        <Button
          className="h-14 w-full text-lg"
          onClick={() => setIsCartOpen(true)}
          disabled={ticket.status !== "OPEN"}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          {ticket.status !== "OPEN" ? (
            <span>Ticket {ticket.status}</span>
          ) : cartItems.length > 0 ? (
            <span>Review {totalCartQuantity} items</span>
          ) : (
            <span>View Ticket</span>
          )}
        </Button>
      </div>

      <ItemCustomizationSheet
        item={selectedItem}
        open={!!selectedItemId}
        onOpenChange={(open) => {
          if (!open) setSelectedItemId(null);
        }}
        ticketId={ticket.id}
      />

      <ComposerCartDrawer
        ticket={ticket}
        menu={menu}
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        onTicketUpdated={(updated) => {
          setTicket(updated);
        }}
      />
    </div>
  );
}
