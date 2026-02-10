"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useAnalyticsRealtime } from "@/hooks/use-analytics-realtime";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Fetch tenant name and branches from API
  const tenantName = "Nereo";
  const branches: { id: string; name: string }[] = [];

  // SSE subscription to analytics channel — keeps KPIs and charts in sync
  const { connectionStatus } = useAnalyticsRealtime();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — hidden on mobile, visible on lg+ */}
      <div className="hidden lg:block">
        <AdminSidebar tenantName={tenantName} branches={branches} />
      </div>

      <div className="flex flex-1 flex-col">
        <AdminHeader
          connectionStatus={connectionStatus}
          tenantName={tenantName}
          branches={branches}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
