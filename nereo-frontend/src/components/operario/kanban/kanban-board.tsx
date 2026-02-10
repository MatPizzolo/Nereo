"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { useBookingsRealtime } from "@/hooks/use-bookings-realtime";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { ProblemModal } from "./problem-modal";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { toast } from "sonner";
import type { Booking, BookingStatus } from "@/lib/booking-types";
import { KANBAN_COLUMNS } from "@/lib/booking-types";

export function KanbanBoard() {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();
  const { connectionStatus } = useBookingsRealtime();

  const queryKey = ["bookings", user?.tenantId, selectedBranchId];

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey,
    queryFn: () =>
      api.get(
        `/api/v1/bookings?tenant_id=${user?.tenantId ?? ""}&branch_id=${selectedBranchId ?? ""}&date=today`
      ),
  });

  // ── Drag state ──
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeBooking = bookings.find((b) => b.id === activeId) ?? null;

  // ── Problem modal ──
  const [problemBookingId, setProblemBookingId] = useState<string | null>(null);

  // Touch-optimized sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  // ── Optimistic status mutation ──
  const statusMutation = useMutation({
    mutationFn: ({
      bookingId,
      newStatus,
    }: {
      bookingId: string;
      newStatus: BookingStatus;
    }) =>
      api.patch(`/api/v1/bookings/${bookingId}/status`, {
        status: newStatus,
      }),
    onMutate: async ({ bookingId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Booking[]>(queryKey);
      queryClient.setQueryData<Booking[]>(queryKey, (old) =>
        (old ?? []).map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: newStatus,
                startedAt:
                  newStatus === "washing" ? new Date().toISOString() : b.startedAt,
                completedAt:
                  newStatus === "ready" ? new Date().toISOString() : b.completedAt,
              }
            : b
        )
      );
      // Haptic feedback
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(100);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("No se pudo mover el lavado");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // ── Problem report mutation ──
  const problemMutation = useMutation({
    mutationFn: ({
      bookingId,
      notes,
    }: {
      bookingId: string;
      notes: string;
    }) =>
      api.post(`/api/v1/bookings/${bookingId}/problem`, { notes }),
  });

  // ── Drag handlers ──
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const bookingId = active.id as string;
      const overColumnId = over.id as BookingStatus;

      // Check if dropped on a column
      if (KANBAN_COLUMNS.some((c) => c.id === overColumnId)) {
        const booking = bookings.find((b) => b.id === bookingId);
        if (booking && booking.status !== overColumnId) {
          statusMutation.mutate({ bookingId, newStatus: overColumnId });
        }
      }
    },
    [bookings, statusMutation]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const bookingId = active.id as string;
      const overId = over.id as string;

      // If dragged over a column directly
      if (KANBAN_COLUMNS.some((c) => c.id === overId)) {
        const booking = bookings.find((b) => b.id === bookingId);
        if (booking && booking.status !== overId) {
          // Optimistic move during drag
          queryClient.setQueryData<Booking[]>(queryKey, (old) =>
            (old ?? []).map((b) =>
              b.id === bookingId ? { ...b, status: overId as BookingStatus } : b
            )
          );
        }
      }
    },
    [bookings, queryClient, queryKey]
  );

  // ── Quick actions ──
  const handleAction = useCallback(
    (bookingId: string, action: "start" | "complete" | "problem") => {
      if (action === "problem") {
        setProblemBookingId(bookingId);
        return;
      }
      const newStatus: BookingStatus =
        action === "start" ? "washing" : "ready";
      statusMutation.mutate({ bookingId, newStatus });
    },
    [statusMutation]
  );

  const handleWhatsApp = useCallback((booking: Booking) => {
    const message = encodeURIComponent(
      `Hola ${booking.customerName}! Tu vehículo ${booking.plate} ya está listo para retirar.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  }, []);

  const handleProblemSubmit = useCallback(
    async (bookingId: string, notes: string) => {
      await problemMutation.mutateAsync({ bookingId, notes });
      toast.success("Problema reportado");
    },
    [problemMutation]
  );

  // ── Group bookings by column ──
  const columnBookings = KANBAN_COLUMNS.map((col) => ({
    ...col,
    bookings: bookings.filter((b) => b.status === col.id),
  }));

  if (isLoading) {
    return <LoadingSkeleton variant="kanban" />;
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {columnBookings.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              bookings={col.bookings}
              onAction={handleAction}
              onWhatsApp={handleWhatsApp}
            />
          ))}
        </div>

        <DragOverlay>
          {activeBooking && (
            <KanbanCard
              booking={activeBooking}
              onAction={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      <ProblemModal
        open={!!problemBookingId}
        onOpenChange={(open) => !open && setProblemBookingId(null)}
        bookingId={problemBookingId}
        onSubmit={handleProblemSubmit}
      />
    </>
  );
}
