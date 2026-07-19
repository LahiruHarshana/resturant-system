import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { AppShell } from "@/components/layout/app-shell";

export default function Loading() {
  return (
    <AppShell>
      <LoadingSkeleton lines={4} />
    </AppShell>
  );
}
