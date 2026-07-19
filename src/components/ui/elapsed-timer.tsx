"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

interface ElapsedTimerProps extends React.HTMLAttributes<HTMLDivElement> {
  firedAt: string | Date;
  warningThresholdMs?: number; // default 10 mins
  dangerThresholdMs?: number; // default 20 mins
}

export function ElapsedTimer({
  firedAt,
  warningThresholdMs = 10 * 60 * 1000,
  dangerThresholdMs = 20 * 60 * 1000,
  className,
  ...props
}: ElapsedTimerProps) {
  const [elapsedMs, setElapsedMs] = React.useState(0);

  React.useEffect(() => {
    const fired = new Date(firedAt).getTime();

    const updateTimer = () => {
      setElapsedMs(Math.max(0, Date.now() - fired));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [firedAt]);

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const displayTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  let stateColor = "text-muted-foreground";
  if (elapsedMs >= dangerThresholdMs) {
    stateColor = "text-danger";
  } else if (elapsedMs >= warningThresholdMs) {
    stateColor = "text-warning";
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 font-mono tabular-nums",
        stateColor,
        className,
      )}
      {...props}
    >
      <Timer className="h-4 w-4" />
      <span>{displayTime}</span>
    </div>
  );
}
