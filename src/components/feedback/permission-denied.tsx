import { ShieldAlert } from "lucide-react";

type PermissionDeniedProps = {
  requiredPermission?: string;
};

export function PermissionDenied({
  requiredPermission,
}: PermissionDeniedProps) {
  return (
    <section className="surface-card" role="alert">
      <div className="icon-badge text-danger">
        <ShieldAlert aria-hidden="true" size={22} />
      </div>
      <h2 className="text-foreground mt-4 text-xl font-semibold">
        Permission required
      </h2>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
        Your account does not currently include the permission needed for this
        action. Ask a manager or Super Admin to review your role assignments.
      </p>
      {requiredPermission ? (
        <p className="bg-muted text-muted-foreground mt-4 rounded-lg px-3 py-2 font-mono text-xs">
          Required: {requiredPermission}
        </p>
      ) : null}
    </section>
  );
}
