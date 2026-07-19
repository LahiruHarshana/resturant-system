import { requirePermission } from "@/server/auth/authorization";
import { QueueClient } from "@/components/cashier/queue-client";

export const metadata = {
  title: "Cashier Queue | Restaurant OS",
};

export default async function CashierQueuePage() {
  await requirePermission("payment:create");
  return <QueueClient />;
}
