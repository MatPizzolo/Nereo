"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Subscriber, WashRecord } from "@/lib/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { WashHistory } from "@/components/admin/subscribers/wash-history";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatPhoneDisplay } from "@/components/shared/phone-input";
import { formatARS } from "@/components/shared/currency-input";
import { useSubscriberMutations } from "@/hooks/use-subscriber-mutations";
import {
  ArrowLeft,
  CreditCard,
  MessageCircle,
  Pause,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState, Suspense } from "react";

export default function SubscriberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: subscriber, isLoading } = useQuery<Subscriber>({
    queryKey: ["subscriber", id],
    queryFn: () => api.get(`/api/v1/subscribers/${id}`),
    enabled: !!id,
  });

  const { data: washes = [] } = useQuery<WashRecord[]>({
    queryKey: ["wash-history", id],
    queryFn: () => api.get(`/api/v1/subscribers/${id}/washes`),
    enabled: !!id,
  });

  const { renewMutation, pauseMutation, cancelMutation } = useSubscriberMutations();

  const [confirmAction, setConfirmAction] = useState<{
    type: "renew" | "pause" | "cancel";
    open: boolean;
  }>({ type: "renew", open: false });

  const mutations = { renew: renewMutation, pause: pauseMutation, cancel: cancelMutation };
  const activeMutation = mutations[confirmAction.type];

  function handleAction(action: "renew" | "pause" | "cancel") {
    mutations[action].mutate(id, {
      onSuccess: () => setConfirmAction({ type: action, open: false }),
    });
  }

  if (isLoading || !subscriber) {
    return <LoadingSkeleton variant="form" rows={8} />;
  }

  const actionLabels = {
    renew: { title: "Renovar membresía", desc: `¿Renovar la membresía de ${subscriber.fullName}?`, label: "Renovar" },
    pause: { title: "Pausar membresía", desc: `¿Pausar la membresía de ${subscriber.fullName}? Podrá reactivarla después.`, label: "Pausar" },
    cancel: { title: "Cancelar membresía", desc: `¿Cancelar la membresía de ${subscriber.fullName}? Esta acción no se puede deshacer.`, label: "Cancelar membresía" },
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{subscriber.fullName}</h1>
            <StatusBadge status={subscriber.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatPhoneDisplay(subscriber.phone)} · {subscriber.plate.toUpperCase()}
            {subscriber.vehicleModel && ` · ${subscriber.vehicleModel}`}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Plan</p>
          <p className="mt-1 text-lg font-bold">{subscriber.plan.name}</p>
          <p className="text-sm text-muted-foreground">
            ${formatARS(subscriber.plan.price)}/{subscriber.plan.interval === "monthly" ? "mes" : subscriber.plan.interval}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Renovación</p>
          <p className="mt-1 text-lg font-bold">
            {new Date(subscriber.renewalDate).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Último lavado</p>
          <p className="mt-1 text-lg font-bold">
            {subscriber.lastWashDate
              ? new Date(subscriber.lastWashDate).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "long",
                })
              : "Sin lavados"}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => setConfirmAction({ type: "renew", open: true })}
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Renovar
        </Button>
        <Button
          variant="outline"
          onClick={() => setConfirmAction({ type: "pause", open: true })}
        >
          <Pause className="mr-1.5 h-4 w-4" />
          Pausar
        </Button>
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmAction({ type: "cancel", open: true })}
        >
          <XCircle className="mr-1.5 h-4 w-4" />
          Cancelar membresía
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const url = `https://wa.me/${subscriber.phone.replace(/\D/g, "")}`;
            window.open(url, "_blank");
          }}
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Enviar WhatsApp
        </Button>
      </div>

      {/* Activity timeline — Wash history (Suspense boundary) */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Historial de lavados</h2>
        <Suspense fallback={<LoadingSkeleton variant="table" rows={3} />}>
          <WashHistory records={washes} />
        </Suspense>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmAction.open}
        onOpenChange={(open) => setConfirmAction((prev) => ({ ...prev, open }))}
        title={actionLabels[confirmAction.type].title}
        description={actionLabels[confirmAction.type].desc}
        confirmLabel={actionLabels[confirmAction.type].label}
        variant={confirmAction.type === "cancel" ? "destructive" : "default"}
        onConfirm={() => handleAction(confirmAction.type)}
        loading={activeMutation.isPending}
      />
    </div>
  );
}
