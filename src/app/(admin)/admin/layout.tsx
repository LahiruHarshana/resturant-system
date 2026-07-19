import { type ReactNode } from "react";
import { requireAuthentication } from "@/server/auth/session";
import { AdminShell } from "@/components/layout/admin-shell";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAuthentication();

  if (!session?.user) {
    redirect("/login");
  }

  // The sidebar will be rendered here.
  // We do not check specific permissions at the layout level because different
  // admin pages require different permissions (e.g., menu:manage, user:manage).
  // The individual pages will enforce their specific requirements.

  return <AdminShell>{children}</AdminShell>;
}
