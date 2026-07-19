"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Minus, Plus, Users } from "lucide-react";
import type { FloorTableDTO } from "@/shared/waiter/schemas";
import { toast } from "sonner";

export function OpenTicketSheet({
  table,
  isOpen,
  onClose,
  onConfirm,
}: {
  table: FloorTableDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (guestCount: number) => Promise<void>;
}) {
  const [guestCount, setGuestCount] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when table changes
  // We want a practical default, e.g. 2 guests, bounded by table seats
  if (table && guestCount > table.seats) {
    setGuestCount(table.seats);
  }

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(guestCount);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to open table");
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-2xl">{table?.label}</DrawerTitle>
            <DrawerDescription>Open a new ticket</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <div className="mb-8 flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                disabled={guestCount <= 1 || isSubmitting}
              >
                <Minus className="h-6 w-6" />
                <span className="sr-only">Decrease</span>
              </Button>
              <div className="flex-1 text-center">
                <div className="text-6xl font-bold tracking-tighter">
                  {guestCount}
                </div>
                <div className="text-muted-foreground mt-1 flex items-center justify-center text-[0.70rem] uppercase">
                  <Users className="mr-1 h-3 w-3" /> Guests
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => setGuestCount(Math.min(100, guestCount + 1))}
                disabled={guestCount >= 100 || isSubmitting}
              >
                <Plus className="h-6 w-6" />
                <span className="sr-only">Increase</span>
              </Button>
            </div>
          </div>
          <DrawerFooter>
            <Button size="lg" onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? "Opening..." : "Open Table"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
