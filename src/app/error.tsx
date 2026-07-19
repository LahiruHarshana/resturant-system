"use client";

import { ErrorState } from "@/components/feedback/error-state";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <ErrorState
        action={<Button onClick={reset}>Try again</Button>}
        description="Something went wrong while loading this workspace. No business operation was completed from this screen."
        title="Workspace unavailable"
      />
    </AppShell>
  );
}
