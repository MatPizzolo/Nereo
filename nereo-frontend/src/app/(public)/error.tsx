"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logErrorToBackend } from "@/lib/error-logger";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logErrorToBackend({ message: error.message, stack: error.stack });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="mt-4 text-xl font-bold">Algo salió mal</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {error.message || "Ocurrió un error inesperado."}
      </p>
      <Button onClick={reset} className="mt-6">
        <RefreshCw className="mr-2 h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
