import { requirePermission } from "@/server/auth/authorization";
import { performDemoAction } from "./actions";
import { Button } from "@/components/ui/button";

export default async function AdminDemoPage() {
  // Requires the 'role:manage' permission to view this page
  // The middleware ensures the user is logged in, but this checks explicit permissions
  const { userId, permissions } = await requirePermission("role:manage");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold tracking-tight">Admin Demo</h1>
      <p className="text-muted-foreground">
        Welcome to the admin demo page. You are authorized to view this page
        because you have the <strong>role:manage</strong> permission.
      </p>

      <div className="bg-muted rounded-md p-4">
        <h2 className="mb-2 font-medium">Your Details</h2>
        <p className="text-sm">User ID: {userId}</p>
        <p className="mt-2 text-sm">Your Effective Permissions:</p>
        <ul className="mt-1 list-inside list-disc text-sm">
          {Array.from(permissions).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        <h2 className="font-medium">Test Server Action</h2>
        <p className="text-muted-foreground text-sm">
          This button calls a server action that requires the{" "}
          <strong>user:manage</strong> permission. If you don&apos;t have it,
          the action will fail with a 403 error.
        </p>
        <form action={performDemoAction}>
          <Button type="submit">Execute Action</Button>
        </form>
      </div>
    </div>
  );
}
