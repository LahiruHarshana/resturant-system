import { type ReactNode } from "react";
import Link from "next/link";
import { ConnectionBanner } from "@/components/feedback/connection-banner";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-background min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col">
        <header className="border-border bg-card/85 flex min-h-14 items-center justify-between gap-4 rounded-full border px-4 py-2 shadow-sm backdrop-blur">
          <Link className="flex min-h-11 items-center gap-3" href="/">
            <span className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full text-sm font-black">
              RO
            </span>
            <span className="text-foreground text-sm font-bold sm:text-base">
              Restaurant Operations
            </span>
          </Link>
          <span className="bg-muted text-muted-foreground hidden rounded-full px-3 py-2 text-xs font-semibold sm:inline-flex">
            Guide 04 foundation
          </span>
        </header>
        <div className="flex-1 py-6 sm:py-8">{children}</div>
      </div>
      <ConnectionBanner />
    </main>
  );
}
