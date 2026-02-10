"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useBranch } from "@/hooks/use-branch";
import type { Subscriber, MembershipStatus } from "@/lib/types";

/**
 * Optimistic mutation hooks for subscriber actions.
 * Each mutation updates the cache immediately and rolls back on error.
 */
export function useSubscriberMutations() {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranch();
  const listKey = ["subscribers", selectedBranchId];

  /** Helper: optimistically update a subscriber's status in the list cache */
  function optimisticStatusUpdate(
    subscriberId: string,
    newStatus: MembershipStatus
  ) {
    const previous = queryClient.getQueryData<Subscriber[]>(listKey);
    if (previous) {
      queryClient.setQueryData<Subscriber[]>(listKey, (old) =>
        (old ?? []).map((s) =>
          s.id === subscriberId ? { ...s, status: newStatus } : s
        )
      );
    }
    // Also update the individual subscriber cache
    const prevDetail = queryClient.getQueryData<Subscriber>([
      "subscriber",
      subscriberId,
    ]);
    if (prevDetail) {
      queryClient.setQueryData<Subscriber>(["subscriber", subscriberId], {
        ...prevDetail,
        status: newStatus,
      });
    }
    return { previous, prevDetail };
  }

  // ── Renew ──
  const renewMutation = useMutation({
    mutationFn: (subscriberId: string) =>
      api.post(`/api/v1/subscribers/${subscriberId}/renew`),
    onMutate: async (subscriberId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      return optimisticStatusUpdate(subscriberId, "active");
    },
    onError: (_err, subscriberId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      if (context?.prevDetail) {
        queryClient.setQueryData(["subscriber", subscriberId], context.prevDetail);
      }
      toast.error("No se pudo renovar la membresía");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  // ── Pause ──
  const pauseMutation = useMutation({
    mutationFn: (subscriberId: string) =>
      api.post(`/api/v1/subscribers/${subscriberId}/pause`),
    onMutate: async (subscriberId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      return optimisticStatusUpdate(subscriberId, "paused");
    },
    onError: (_err, subscriberId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      if (context?.prevDetail) {
        queryClient.setQueryData(["subscriber", subscriberId], context.prevDetail);
      }
      toast.error("No se pudo pausar la membresía");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  // ── Cancel ──
  const cancelMutation = useMutation({
    mutationFn: (subscriberId: string) =>
      api.post(`/api/v1/subscribers/${subscriberId}/cancel`),
    onMutate: async (subscriberId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      return optimisticStatusUpdate(subscriberId, "expired");
    },
    onError: (_err, subscriberId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      if (context?.prevDetail) {
        queryClient.setQueryData(["subscriber", subscriberId], context.prevDetail);
      }
      toast.error("No se pudo cancelar la membresía");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  // ── Create (optimistic insert into table) ──
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<Subscriber>("/api/v1/subscribers", data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Subscriber[]>(listKey);

      // Create an optimistic subscriber with a temp ID
      const optimistic: Subscriber = {
        id: `temp-${Date.now()}`,
        fullName: (data.fullName as string) ?? "",
        phone: (data.phone as string) ?? "",
        email: (data.email as string) ?? "",
        plate: (data.plate as string) ?? "",
        vehicleModel: (data.vehicleModel as string) ?? "",
        plan: { id: (data.planId as string) ?? "", name: "...", price: 0, interval: "monthly", features: [] },
        status: "active",
        renewalDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        branchId: selectedBranchId ?? "",
      };

      queryClient.setQueryData<Subscriber[]>(listKey, (old) => [
        optimistic,
        ...(old ?? []),
      ]);

      return { previous };
    },
    onSuccess: () => {
      toast.success("Suscriptor creado");
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toast.error("No se pudo crear el suscriptor");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });

  return {
    renewMutation,
    pauseMutation,
    cancelMutation,
    createMutation,
  };
}
