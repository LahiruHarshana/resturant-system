"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConnectionBanner() {
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Initial check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className={cn(
        "animate-in slide-in-from-bottom-2 fixed right-4 bottom-4 z-50 flex items-center gap-2",
        "border-danger bg-danger/10 text-danger rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm",
      )}
      role="alert"
    >
      <WifiOff className="h-4 w-4" />
      <span className="font-semibold">You are offline.</span>
      <span>Some features may be unavailable.</span>
    </div>
  );
}
