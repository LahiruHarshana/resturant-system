import { AlertTriangle } from "lucide-react";
import { type ReactNode } from "react";

type ErrorStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function ErrorState({ action, description, title }: ErrorStateProps) {
  return (
    <section className="surface-card" role="alert">
      <div className="icon-badge text-danger">
        <AlertTriangle aria-hidden="true" size={22} />
      </div>
      <h2 className="text-foreground mt-4 text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
