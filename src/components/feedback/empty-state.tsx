import { Inbox } from "lucide-react";

type EmptyStateProps = {
  description: string;
  title: string;
};

export function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <section className="surface-card text-center" role="status">
      <div className="icon-badge mx-auto">
        <Inbox aria-hidden="true" size={22} />
      </div>
      <h2 className="text-foreground mt-4 text-xl font-semibold">{title}</h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
    </section>
  );
}
