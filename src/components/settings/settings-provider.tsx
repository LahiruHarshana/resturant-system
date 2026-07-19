"use client";

import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

interface SettingsContextValue {
  restaurantName: string;
  currency: string;
  currencyMinorDigits: number;
  taxBps: number;
}

const defaultSettings: SettingsContextValue = {
  restaurantName: "Demo Restaurant",
  currency: "USD",
  currencyMinorDigits: 2,
  taxBps: 1000,
};

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery({
    queryKey: ["global-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // If unauthorized, just use defaults (e.g. login screen)
          return defaultSettings;
        }
        throw new Error("Failed to fetch settings");
      }
      return res.json() as Promise<SettingsContextValue>;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2,
  });

  return (
    <SettingsContext.Provider value={settings || defaultSettings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return defaultSettings;
  }
  return context;
}
