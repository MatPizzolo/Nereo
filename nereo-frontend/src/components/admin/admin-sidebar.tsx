"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BranchSelector } from "@/components/shared/branch-selector";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { api } from "@/lib/api";
import { useState, useCallback } from "react";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/suscriptores", icon: Users, label: "Suscriptores" },
  { href: "/admin/configuracion", icon: Settings, label: "Configuración" },
];

export interface AdminSidebarProps {
  tenantName?: string;
  branches?: { id: string; name: string }[];
  className?: string;
}

export function AdminSidebar({
  tenantName = "Nereo",
  branches = [],
  className,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);

  // Prefetch data on nav link hover for instant page transitions
  const handlePrefetch = useCallback(
    (href: string) => {
      const branchParam = selectedBranchId ?? "";
      if (href === "/admin") {
        queryClient.prefetchQuery({
          queryKey: ["analytics", "kpis", selectedBranchId],
          queryFn: () => api.get(`/api/v1/analytics/kpis?branch_id=${branchParam}`),
          staleTime: 30_000,
        });
      } else if (href === "/admin/suscriptores") {
        queryClient.prefetchQuery({
          queryKey: ["subscribers", selectedBranchId],
          queryFn: () => api.get(`/api/v1/subscribers?branch_id=${branchParam}`),
          staleTime: 30_000,
        });
      }
    },
    [queryClient, selectedBranchId]
  );

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header: Logo + Tenant name */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-primary truncate">
            {tenantName}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 shrink-0"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Branch selector */}
      {!collapsed && branches.length > 1 && (
        <div className="border-b p-3">
          <BranchSelector branches={branches} className="w-full" />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => handlePrefetch(item.href)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t p-3">
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {user?.fullName ?? "Usuario"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.role === "owner" ? "Dueño" : "Manager"}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8 shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
