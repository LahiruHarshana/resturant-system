"use server";

import { requirePermission } from "@/server/auth/authorization";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function performDemoAction(_formData: FormData): Promise<void> {
  try {
    // Requires the 'user:manage' permission to execute this server action
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId: _userId } = await requirePermission("user:manage");

    // Success, nothing to return for Server Component form action
  } catch (error: unknown) {
    // Fail silently or handle error in a real app
    console.error(
      "Action failed:",
      error instanceof Error ? error.message : "Unknown",
    );
  }
}
