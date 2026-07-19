import { requireAuthentication } from "@/server/auth/session";

import Link from "next/link";
import {
  Coffee,
  LayoutGrid,
  Shield,
  Store,
  Users,
  UtensilsCrossed,
  Settings,
} from "lucide-react";
import { resolveEffectivePermissions } from "@/server/auth/authorization";

export const metadata = {
  title: "Admin Dashboard | Restaurant Operations",
};

export default async function AdminDashboardPage() {
  const session = await requireAuthentication();
  const permissions = await resolveEffectivePermissions(session.user.id);

  // Helper to determine if the user has access to a specific section
  const hasAccess = (
    permission: import("@/shared/authorization/permissions").PermissionKey,
  ) => permissions.permissions.has(permission);

  const sections = [
    {
      title: "Stations",
      description: "Manage prep stations like Kitchen and Bar.",
      url: "/admin/stations",
      icon: Coffee,
      hasAccess: hasAccess("menu:manage"),
    },
    {
      title: "Categories",
      description: "Organize the menu into categories.",
      url: "/admin/menu/categories",
      icon: LayoutGrid,
      hasAccess: hasAccess("menu:manage"),
    },
    {
      title: "Menu Items",
      description: "Manage products, prices, and modifiers.",
      url: "/admin/menu/items",
      icon: UtensilsCrossed,
      hasAccess: hasAccess("menu:manage"),
    },
    {
      title: "Zones & Tables",
      description: "Configure the dining floor layout.",
      url: "/admin/tables",
      icon: Store,
      hasAccess: hasAccess("table:manage"),
    },
    {
      title: "Roles & Permissions",
      description: "Define staff roles and access levels.",
      url: "/admin/roles",
      icon: Shield,
      hasAccess: hasAccess("role:manage"),
    },
    {
      title: "Users",
      description: "Manage staff accounts and credentials.",
      url: "/admin/users",
      icon: Users,
      hasAccess: hasAccess("user:manage"),
    },
    {
      title: "Settings",
      description: "Configure restaurant-wide preferences.",
      url: "/admin/settings",
      icon: Settings,
      hasAccess: hasAccess("settings:manage"), // Or similar
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="relative">
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-3 text-lg max-w-2xl">
          Welcome to your configuration workspace. Manage everything from staff permissions to your menu structure in one unified view.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map((section) => (
          <Link
            key={section.url}
            href={section.hasAccess ? section.url : "#"}
            className={
              !section.hasAccess
                ? "pointer-events-none opacity-50 relative group"
                : "relative group outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl transition-all"
            }
          >
            {/* The glass card */}
            <div className={`h-full flex flex-col p-6 rounded-2xl border ${!section.hasAccess ? 'bg-card/40 border-border/20' : 'glass-card'}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className={`p-3 rounded-xl transition-all duration-300 ${!section.hasAccess ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110'}`}>
                  <section.icon className="h-6 w-6" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {section.description}
                </p>
              </div>

              {!section.hasAccess && (
                <div className="mt-auto pt-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive border border-destructive/20">
                    <Shield className="h-3 w-3" />
                    Permission Required
                  </div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
