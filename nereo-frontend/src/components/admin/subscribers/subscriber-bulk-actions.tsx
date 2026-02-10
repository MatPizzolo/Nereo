"use client";

import { Button } from "@/components/ui/button";
import { Download, MessageCircle } from "lucide-react";
import type { Subscriber } from "@/lib/types";

export interface SubscriberBulkActionsProps {
  selectedCount: number;
  onSendWhatsApp: () => void;
  onExportCSV: () => void;
}

export function SubscriberBulkActions({
  selectedCount,
  onSendWhatsApp,
  onExportCSV,
}: SubscriberBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} seleccionado{selectedCount > 1 ? "s" : ""}
      </span>
      <div className="ml-2 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSendWhatsApp}>
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
          Enviar WhatsApp
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCSV}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Exportar CSV
        </Button>
      </div>
    </div>
  );
}

/** Utility: export subscribers to CSV and trigger download */
export function exportSubscribersCSV(subscribers: Subscriber[]) {
  const headers = [
    "Nombre",
    "Teléfono",
    "Email",
    "Patente",
    "Plan",
    "Estado",
    "Renovación",
    "Último lavado",
  ];

  const rows = subscribers.map((s) => [
    s.fullName,
    s.phone,
    s.email ?? "",
    s.plate,
    s.plan.name,
    s.status,
    s.renewalDate,
    s.lastWashDate ?? "",
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `suscriptores_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
