import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useOrderCart } from "@/hooks/use-order-cart";
import {
  minorToDisplay,
  addMinor,
  multiplyMinorByQuantity,
} from "@/shared/money/money";
import type { TicketDTO, WaiterMenuDTO } from "@/shared/waiter/schemas";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

interface ComposerCartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketDTO;
  menu: WaiterMenuDTO;
  onTicketUpdated: (ticket: TicketDTO) => void;
}

export function ComposerCartDrawer({
  open,
  onOpenChange,
  ticket,
  menu,
  onTicketUpdated,
}: ComposerCartDrawerProps) {
  const [isFiring, setIsFiring] = useState(false);
  const router = useRouter();

  const cartItems = useOrderCart(
    (state) => state.itemsByTicket[ticket.id]
  ) || [];
  const removeItem = useOrderCart((state) => state.removeItem);
  const clearCart = useOrderCart((state) => state.clearCart);

  const { data: existingLinesData, isLoading: isLoadingLines } = useQuery({
    queryKey: ["ticket-lines", ticket.id],
    queryFn: async () => {
      const res = await fetch(`/api/waiter/tickets/${ticket.id}/lines`);
      if (!res.ok) throw new Error("Failed to fetch lines");
      return res.json();
    },
    enabled: open && (ticket.totalMinor || 0) > 0, // Only fetch when open and has a total
  });

  // Map cart items back to menu items to get names and prices
  let draftTotalMinor = 0;
  const renderableItems = cartItems
    .map((cartItem) => {
      const menuItem = menu.items.find((i) => i.id === cartItem.menuItemId);
      if (!menuItem) return null;

      let modifiersMinor = 0;
      cartItem.modifierSelections?.forEach((sel) => {
        const group = menuItem.modifiers?.find((g) => g.name === sel.groupName);
        const opt = group?.options.find((o) => o.name === sel.optionName);
        if (opt?.priceDeltaMinor) {
          modifiersMinor = addMinor(modifiersMinor, opt.priceDeltaMinor);
        }
      });

      const lineTotalMinor = multiplyMinorByQuantity(
        addMinor(menuItem.priceMinor, modifiersMinor),
        cartItem.quantity,
      );
      draftTotalMinor = addMinor(draftTotalMinor, lineTotalMinor);

      return {
        cartItem,
        menuItem,
        lineTotalMinor,
        modifiersMinor,
      };
    })
    .filter((x) => x !== null);

  const handleFire = async () => {
    if (cartItems.length === 0) return;
    setIsFiring(true);

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(`/api/waiter/tickets/${ticket.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cartItems.map((ci) => ({
            menuItemId: ci.menuItemId,
            quantity: ci.quantity,
            note: ci.note,
            modifierSelections: ci.modifierSelections,
          })),
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add lines");
      }

      toast.success("Order lines added successfully!");
      clearCart(ticket.id);
      onTicketUpdated(data.ticket);
      onOpenChange(false);
      router.refresh(); // Refresh the Server Component side if necessary
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    } finally {
      setIsFiring(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Review Order</DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4">
          {renderableItems.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Cart is empty.
            </p>
          ) : (
            <div className="space-y-4">
              {renderableItems.map(({ cartItem, menuItem, lineTotalMinor }) => (
                <div
                  key={cartItem.cartItemId}
                  className="flex flex-col border-b pb-4 last:border-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold">
                        {cartItem.quantity}x {menuItem.name}
                      </span>
                      {cartItem.modifierSelections &&
                        cartItem.modifierSelections.length > 0 && (
                          <div className="text-muted-foreground mt-1 pl-4 text-sm">
                            {cartItem.modifierSelections.map((sel, idx) => (
                              <div key={idx}>+ {sel.optionName}</div>
                            ))}
                          </div>
                        )}
                      {cartItem.note && (
                        <div className="text-muted-foreground mt-1 pl-4 text-sm italic">
                          Note: {cartItem.note}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-semibold text-green-600">
                        ${minorToDisplay(lineTotalMinor, 2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          removeItem(ticket.id, cartItem.cartItemId)
                        }
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(ticket.totalMinor || 0) > 0 && renderableItems.length === 0 && (
            <div className="bg-muted mt-4 rounded-lg p-4">
              <div className="flex justify-between font-semibold mb-2">
                <span>Existing Ticket Total</span>
                <span>${minorToDisplay(ticket.totalMinor || 0, 2)}</span>
              </div>
              
              {isLoadingLines ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : existingLinesData?.lines && existingLinesData.lines.length > 0 ? (
                <div className="space-y-3 mt-4 border-t pt-4">
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Already Ordered</div>
                  {existingLinesData.lines
                    .filter((l: any) => l.status !== "VOID")
                    .map((line: any) => (
                    <div key={line.id} className="flex flex-col text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">{line.quantity}x {line.nameSnapshot}</span>
                          {line.modifierSnapshots?.length > 0 && (
                            <div className="text-muted-foreground ml-4 text-xs">
                              {line.modifierSnapshots.map((m: any, i: number) => (
                                <div key={i}>+ {m.nameSnapshot}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium">${minorToDisplay(line.priceSnapshotMinor, 2)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold ${
                            line.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                            line.status === 'PREPARING' ? 'bg-amber-100 text-amber-700' :
                            line.status === 'READY' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {line.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm">
                  This ticket already has items on it. See receipt for details.
                </p>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="border-t pt-4">
          <div className="mb-2 flex w-full items-center justify-between px-2">
            <span className="text-muted-foreground">Draft Subtotal</span>
            <span className="font-semibold">
              ${minorToDisplay(draftTotalMinor, 2)}
            </span>
          </div>
          {cartItems.length > 0 ? (
            <Button
              onClick={handleFire}
              disabled={isFiring}
              size="lg"
              className="h-14 w-full text-lg"
            >
              {isFiring ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              {isFiring ? "Firing..." : "Fire to Kitchen"}
            </Button>
          ) : ticket.status === "OPEN" ? (
            <Button
              onClick={async () => {
                setIsFiring(true);
                try {
                  const res = await fetch(
                    `/api/waiter/tickets/${ticket.id}/close`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        idempotencyKey: crypto.randomUUID(),
                      }),
                    },
                  );
                  const data = await res.json();
                  if (!res.ok)
                    throw new Error(data.error || "Failed to close ticket");
                  toast.success("Ticket closed and sent to cashier!");
                  onTicketUpdated(data.ticket);
                  onOpenChange(false);
                  router.refresh();
                } catch (err: unknown) {
                  toast.error(
                    err instanceof Error ? err.message : "Unknown error",
                  );
                } finally {
                  setIsFiring(false);
                }
              }}
              disabled={isFiring}
              size="lg"
              className="h-14 w-full text-lg"
              variant="default"
            >
              {isFiring ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              {isFiring ? "Closing..." : "Close Ticket / Send to Cashier"}
            </Button>
          ) : (
            <Button disabled size="lg" className="h-14 w-full text-lg">
              No items to fire
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
