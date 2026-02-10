"use client";

import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/hooks/use-realtime-channel";

const statusConfig: Record<
  ConnectionStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  connected: {
    label: "En vivo",
    dotClass: "bg-green-500 animate-pulse",
    textClass: "text-green-700",
  },
  connecting: {
    label: "Conectando...",
    dotClass: "bg-yellow-500 animate-pulse",
    textClass: "text-yellow-700",
  },
  reconnecting: {
    label: "Reconectando...",
    dotClass: "bg-yellow-500 animate-pulse",
    textClass: "text-yellow-700",
  },
  disconnected: {
    label: "Sin conexión",
    dotClass: "bg-gray-400",
    textClass: "text-gray-500",
  },
};

export interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

export function ConnectionIndicator({
  status,
  className,
}: ConnectionIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
      <span className={cn("text-xs font-medium", config.textClass)}>
        {config.label}
      </span>
    </div>
  );
}
