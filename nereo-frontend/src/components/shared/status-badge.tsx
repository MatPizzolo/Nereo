"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

const statusBadgeVariants = cva("text-xs font-medium", {
  variants: {
    status: {
      active:
        "bg-[var(--status-active)]/15 text-[var(--status-active)] border-[var(--status-active)]/30",
      expired:
        "bg-[var(--status-expired)]/15 text-[var(--status-expired)] border-[var(--status-expired)]/30",
      pending:
        "bg-[var(--status-pending)]/15 text-[var(--status-pending)] border-[var(--status-pending)]/30",
      paused:
        "bg-[var(--status-paused)]/15 text-[var(--status-paused)] border-[var(--status-paused)]/30",
    },
  },
  defaultVariants: {
    status: "active",
  },
});

const statusLabels: Record<string, string> = {
  active: "Activo",
  expired: "Vencido",
  pending: "Pendiente",
  paused: "Pausado",
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  label?: string;
}

export function StatusBadge({
  status,
  label,
  className,
  ...props
}: StatusBadgeProps) {
  const resolvedStatus = status ?? "active";

  return (
    <Badge
      variant="outline"
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      <span
        className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `var(--status-${resolvedStatus})` }}
      />
      {label ?? statusLabels[resolvedStatus] ?? resolvedStatus}
    </Badge>
  );
}
