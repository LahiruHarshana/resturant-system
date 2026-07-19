import { EmptyState } from "@/components/feedback/empty-state";
import { AppShell } from "@/components/layout/app-shell";

export default function NotFound() {
  return (
    <AppShell>
      <EmptyState
        description="The requested restaurant operations page does not exist or has not been implemented in the current guide."
        title="Page not found"
      />
    </AppShell>
  );
}
