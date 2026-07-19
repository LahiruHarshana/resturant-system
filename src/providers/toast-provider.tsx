"use client";

import { type ReactNode } from "react";

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="sr-only"
        id="toast-live-region"
      />
    </>
  );
}
