"use client";

import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PWAInstallBanner() {
  const { canInstall, install, dismiss } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t bg-background p-3 shadow-lg">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <p className="text-sm font-medium">
          Instalá Nereo en tu pantalla de inicio
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={install}>
            <Download className="mr-1.5 h-4 w-4" />
            Instalar
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
