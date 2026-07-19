import { type Metadata } from "next";
import { ReportsClient } from "./reports-client";
import { requirePermission } from "@/server/auth/authorization";

export const metadata: Metadata = {
  title: "Reports | Restaurant Admin",
  description: "View restaurant performance reports",
};

export default async function ReportsPage() {
  await requirePermission("report:view");
  return <ReportsClient />;
}
