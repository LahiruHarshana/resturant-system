import { ArrowRight, Bell, CreditCard, ShieldCheck, Soup, LogOut } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/auth";
import Link from "next/link";
import { PermissionKey } from "@/shared/authorization/permissions";
import { resolveEffectivePermissions } from "@/server/auth/authorization";

export default async function Home() {
  const session = await auth();
  
  if (session) {
    const { permissions: userPermissions } = await resolveEffectivePermissions(session.user.id);
    
    // Filter available modules based on permissions
    const availableModules = workspaceCards.filter(card => 
      card.requiredPermissions.some(p => userPermissions.has(p)) || userPermissions.has("user:manage") // Super admin fallback
    );

    return (
      <AppShell>
        <PageHeader
          eyebrow={`Welcome back, ${session.user?.name || "User"}`}
          title="Your Workspace"
          description="Select a module below to get started. You only see modules you have permission to access."
          actions={
            <Link className="btn-primary" href="/api/auth/signout">
              <LogOut aria-hidden="true" size={18} />
              Logout
            </Link>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {availableModules.length > 0 ? (
            availableModules.map((card) => (
              <Link href={card.url} key={card.title} className="block outline-none">
                <article className="group relative h-full overflow-hidden rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5 hover:ring-primary/30">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                    {card.icon}
                  </div>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {card.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                  <div className="mt-6 flex items-center text-sm font-semibold text-primary/80 transition-colors group-hover:text-primary">
                    Open App <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </article>
              </Link>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <p>You don't have access to any modules yet.</p>
              <p>Please contact an administrator to assign roles to your account.</p>
            </div>
          )}
        </section>
      </AppShell>
    );
  }

  // Original marketing page for non-logged-in users
  return (
    <AppShell>
      <PageHeader
        eyebrow="Foundation ready"
        title="Restaurant operations platform"
        description="A fast, role-aware foundation for waiter ordering, Kitchen and Bar displays, cashier settlement, and admin operations."
        actions={
          <Link className="btn-primary" href="/login">
            Sign In
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workspaceCards.map((card) => (
          <article className="group relative overflow-hidden rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/20" key={card.title}>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
              {card.icon}
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
              {card.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {card.description}
            </p>
          </article>
        ))}
      </section>

      <section
        className="surface-panel mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
        id="foundation-boundary"
      >
        <div>
          <p className="section-kicker">Implementation boundary</p>
          <h2 className="text-foreground mt-2 text-2xl font-semibold">
            Built for the documented architecture
          </h2>
          <p className="text-muted-foreground mt-4 max-w-3xl text-sm leading-6">
            This foundation keeps presentation, route handlers, domain services,
            data access, real-time notifications, and audit concerns separated
            so future guides can add features without breaking business
            invariants.
          </p>
        </div>
        <ul className="text-muted-foreground grid gap-3 text-sm">
          <li className="check-row">Server state remains authoritative.</li>
          <li className="check-row">
            Real-time events stay behind an abstraction.
          </li>
          <li className="check-row">Money will use integer minor units.</li>
          <li className="check-row">
            Permissions drive access, not role names.
          </li>
        </ul>
      </section>
    </AppShell>
  );
}

type WorkspaceCard = {
  title: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  requiredPermissions: PermissionKey[];
};

const workspaceCards: WorkspaceCard[] = [
  {
    title: "Waiter mobile PWA",
    description:
      "Mobile-first workspace for opening tables, firing orders, receiving READY alerts, and closing tickets.",
    icon: <Bell aria-hidden="true" size={24} />,
    url: "/waiter/floor",
    requiredPermissions: ["order:create", "table:read"],
  },
  {
    title: "Kitchen and Bar",
    description:
      "Touch-optimized station displays with large targets and compact real-time queue updates.",
    icon: <Soup aria-hidden="true" size={24} />,
    url: "/stations",
    requiredPermissions: ["line:read:kitchen", "line:read:bar"],
  },
  {
    title: "Cashier settlement",
    description:
      "Designed for idempotent payment flow, receipt generation, and table release after successful payment.",
    icon: <CreditCard aria-hidden="true" size={24} />,
    url: "/cashier/queue",
    requiredPermissions: ["payment:create"],
  },
  {
    title: "Admin controls",
    description:
      "Permission-based user, role, menu, station, table, report, and audit management foundation.",
    icon: <ShieldCheck aria-hidden="true" size={24} />,
    url: "/admin",
    requiredPermissions: ["user:manage", "menu:manage", "report:view"],
  },
];
