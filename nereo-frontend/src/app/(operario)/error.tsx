"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logErrorToBackend } from "@/lib/error-logger";

export default function OperarioError({
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
      <h2 className="mt-4 text-xl font-bold">Error</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {error.message || "Ocurrió un error. Intentá de nuevo."}
      </p>
      <Button onClick={reset} size="lg" className="mt-6 min-h-[56px] text-base">
        <RefreshCw className="mr-2 h-5 w-5" />
        Reintentar
      </Button>
    </div>
  );
}
