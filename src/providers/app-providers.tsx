"use client";

import { type ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { SettingsProvider } from "@/components/settings/settings-provider";

import { TooltipProvider } from "@/components/ui/tooltip";

import { RealTimeProvider } from "@/components/realtime/provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <RealTimeProvider>
      <QueryProvider>
        <SettingsProvider>
          <TooltipProvider>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </SettingsProvider>
      </QueryProvider>
    </RealTimeProvider>
  );
}
