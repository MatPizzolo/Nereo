"use client";

import { cn } from "@/lib/utils";
import { OperarioHeader } from "@/components/operario/operario-header";
import { PWAInstallBanner } from "@/components/operario/pwa-install-banner";
import { useBookingsRealtime } from "@/hooks/use-bookings-realtime";
import { ClipboardList, QrCode, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/operario", icon: ClipboardList, label: "Lavados" },
  { href: "/operario/checkin", icon: QrCode, label: "Check-in" },
  { href: "/operario/config", icon: Settings, label: "Config" },
];

export default function OperarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // SSE subscription to bookings channel — keeps Kanban columns in sync
  const { connectionStatus } = useBookingsRealtime();

  return (
    <div className="flex min-h-screen flex-col">
      <OperarioHeader connectionStatus={connectionStatus} />

      {/* PWA install prompt (shows on second visit) */}
      <PWAInstallBanner />

      {/* Content — full height minus header and bottom nav */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">{children}</main>

      {/* Bottom navigation — 3 tabs max, large touch targets */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background safe-area-pb">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[56px] min-w-[56px] flex-col items-center justify-center gap-0.5 px-4 py-2 text-xs transition-colors",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-6 w-6" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
