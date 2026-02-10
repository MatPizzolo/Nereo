"use client";

import { Button } from "@/components/ui/button";
import { ConnectionIndicator } from "@/components/shared/connection-indicator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./admin-sidebar";
import { Bell, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ConnectionStatus } from "@/hooks/use-realtime-channel";

const breadcrumbLabels: Record<string, string> = {
  admin: "Dashboard",
  suscriptores: "Suscriptores",
  configuracion: "Configuración",
};

export interface AdminHeaderProps {
  connectionStatus?: ConnectionStatus;
  notificationCount?: number;
  tenantName?: string;
  branches?: { id: string; name: string }[];
}

export function AdminHeader({
  connectionStatus = "disconnected",
  notificationCount = 0,
  tenantName,
  branches,
}: AdminHeaderProps) {
  const pathname = usePathname();

  // Build breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map(
    (seg) => breadcrumbLabels[seg] ?? seg
  );

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <AdminSidebar tenantName={tenantName} branches={branches} />
          </SheetContent>
        </Sheet>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-muted-foreground">/</span>
              )}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <ConnectionIndicator status={connectionStatus} />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
