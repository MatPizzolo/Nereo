"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Droplets, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckInResultType = "active" | "expired" | "invalid";

export interface CheckInResultProps {
  type: CheckInResultType;
  customerName?: string;
  plate?: string;
  plan?: string;
  onRegisterWash?: () => void;
  onChargeSingle?: () => void;
  onRenew?: () => void;
  onRetry?: () => void;
}

export function CheckInResult({
  type,
  customerName,
  plate,
  plan,
  onRegisterWash,
  onChargeSingle,
  onRenew,
  onRetry,
}: CheckInResultProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border-4 p-6 text-center",
        type === "active" && "border-[var(--status-active)] bg-[var(--status-active)]/5",
        type === "expired" && "border-[var(--status-expired)] bg-[var(--status-expired)]/5",
        type === "invalid" && "border-muted bg-muted/30"
      )}
    >
      {/* Icon */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background">
        {type === "active" && (
          <CheckCircle className="h-10 w-10 text-[var(--status-active)]" />
        )}
        {type === "expired" && (
          <XCircle className="h-10 w-10 text-[var(--status-expired)]" />
        )}
        {type === "invalid" && (
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold">
        {type === "active" && "Membresía activa"}
        {type === "expired" && "Membresía vencida"}
        {type === "invalid" && "QR inválido"}
      </h2>

      {/* Customer info */}
      {customerName && (
        <div className="mt-3 space-y-1">
          <p className="text-lg font-semibold">{customerName}</p>
          {plate && (
            <p className="text-base font-mono uppercase text-muted-foreground">
              {plate}
            </p>
          )}
          {plan && (
            <p className="text-sm text-muted-foreground">Plan: {plan}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3">
        {type === "active" && onRegisterWash && (
          <Button
            size="lg"
            className="min-h-[56px] text-lg font-bold bg-[var(--status-active)] hover:bg-[var(--status-active)]/90"
            onClick={onRegisterWash}
          >
            <Droplets className="mr-2 h-6 w-6" />
            Registrar Lavado
          </Button>
        )}
        {type === "expired" && (
          <>
            {onChargeSingle && (
              <Button
                size="lg"
                className="min-h-[56px] text-lg font-bold"
                onClick={onChargeSingle}
              >
                <CreditCard className="mr-2 h-6 w-6" />
                Cobrar lavado único
              </Button>
            )}
            {onRenew && (
              <Button
                size="lg"
                variant="outline"
                className="min-h-[56px] text-lg font-bold"
                onClick={onRenew}
              >
                Renovar membresía
              </Button>
            )}
          </>
        )}
        {type === "invalid" && onRetry && (
          <Button
            size="lg"
            variant="outline"
            className="min-h-[56px] text-lg font-bold"
            onClick={onRetry}
          >
            Buscar por patente
          </Button>
        )}
      </div>
    </div>
  );
}
