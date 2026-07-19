import { type Metadata } from "next";
import { AuditLogsClient } from "./audit-logs-client";
import { requirePermission } from "@/server/auth/authorization";

export const metadata: Metadata = {
  title: "Audit Logs | Restaurant Admin",
  description: "View system audit logs",
};

export default async function AuditLogsPage() {
  await requirePermission("audit:view");
  return <AuditLogsClient />;
}
