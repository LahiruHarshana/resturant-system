"use client";

import { Clock, Users, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FloorTableDTO } from "@/shared/waiter/schemas";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { useEffect, useState } from "react";

export function TableCard({
  table,
  onOpen,
  onResume,
}: {
  table: FloorTableDTO;
  onOpen: (table: FloorTableDTO) => void;
  onResume: (table: FloorTableDTO) => void;
}) {
  const isOccupied = table.status === "OCCUPIED";
  const [elapsed, setElapsed] = useState<string>("");

  useEffect(() => {
    if (!isOccupied || !table.openedAt) {
      setElapsed("");
      return;
    }
    const updateElapsed = () => {
      try {
        setElapsed(
          formatDistanceToNowStrict(parseISO(table.openedAt!), {
            addSuffix: false,
          }),
        );
      } catch {
        setElapsed("");
      }
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [isOccupied, table.openedAt]);

  return (
    <button
      onClick={() => (isOccupied ? onResume(table) : onOpen(table))}
      className={cn(
        "relative flex min-h-[100px] w-full flex-col items-start rounded-xl border p-4 text-left shadow-sm transition-all active:scale-[0.98]",
        isOccupied
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
          : "bg-card border-border hover:bg-muted/50",
      )}
    >
      <div className="mb-3 flex w-full items-start justify-between">
        <div>
          <h3 className="mb-1 text-xl leading-none font-bold">{table.label}</h3>
          <div className="text-muted-foreground flex items-center text-sm">
            <Users className="mr-1 h-4 w-4" />
            <span>{table.seats} seats</span>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center rounded-md px-2 py-1 text-xs font-semibold",
            isOccupied
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isOccupied ? "Occupied" : "Free"}
        </div>
      </div>

      <div className="mt-auto w-full">
        {isOccupied ? (
          <div className="text-primary flex w-full items-center justify-between text-sm font-medium">
            <div className="flex items-center">
              <ReceiptText className="mr-1 h-4 w-4" />
              <span>#{table.ticketNo}</span>
            </div>
            {elapsed && (
              <div className="text-muted-foreground flex items-center text-xs">
                <Clock className="mr-1 h-3.5 w-3.5" />
                {elapsed}
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm font-medium">
            Tap to open
          </div>
        )}
      </div>
    </button>
  );
}
