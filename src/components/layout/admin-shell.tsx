"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ConnectionBanner } from "@/components/feedback/connection-banner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  UtensilsCrossed,
  LayoutGrid,
  Users,
  Shield,
  Settings,
  Coffee,
  Store,
  LineChart,
  ClipboardList,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Reports", url: "/admin/reports", icon: LineChart },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: ClipboardList },
  { title: "Stations", url: "/admin/stations", icon: Coffee },
  { title: "Categories", url: "/admin/menu/categories", icon: LayoutGrid },
  { title: "Menu Items", url: "/admin/menu/items", icon: UtensilsCrossed },
  { title: "Zones & Tables", url: "/admin/tables", icon: Store },
  { title: "Roles & Permissions", url: "/admin/roles", icon: Shield },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader className="flex h-16 items-center justify-center border-b px-6 lg:justify-start">
          <Link href="/admin" className="flex items-center gap-3 font-bold transition-transform hover:scale-105 active:scale-95">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full shadow-sm">
              RO
            </div>
            <span className="text-lg tracking-tight">Restaurant Admin</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Configuration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.url === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.url)
                      }
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span className="truncate">Exit to App</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="mr-2 h-4 w-4 text-destructive" />
                <span className="truncate text-destructive">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6 opacity-50" />
          <div className="text-muted-foreground text-sm font-medium">
            Admin Workspace
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-muted/20">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
      <ConnectionBanner />
    </SidebarProvider>
  );
}
