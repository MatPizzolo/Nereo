"use client";

import { Button } from "@/components/ui/button";
import { ConnectionIndicator } from "@/components/shared/connection-indicator";
import { useHighContrast } from "@/hooks/use-high-contrast";
import { Droplets, Sun, SunDim } from "lucide-react";
import type { ConnectionStatus } from "@/hooks/use-realtime-channel";

export interface OperarioHeaderProps {
  connectionStatus?: ConnectionStatus;
}

export function OperarioHeader({
  connectionStatus = "disconnected",
}: OperarioHeaderProps) {
  const { enabled: highContrast, toggle: toggleHighContrast } =
    useHighContrast();

  return (
    <header className="flex h-12 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <Droplets className="h-5 w-5 text-primary" />
        <span className="text-base font-bold text-primary hidden sm:inline">
          Nereo
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ConnectionIndicator status={connectionStatus} />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleHighContrast}
          title={highContrast ? "Desactivar alto contraste" : "Activar alto contraste (sol)"}
          className="h-9 w-9"
        >
          {highContrast ? (
            <SunDim className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
