"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useRealtimeChannel,
  type ConnectionStatus,
} from "@/hooks/use-realtime-channel";
import { useCallback } from "react";

export type BookingStatus =
  | "confirmed"
  | "in_progress"
  | "washing"
  | "drying"
  | "completed"
  | "cancelled";

export interface BookingEvent {
  type: "booking_created" | "booking_updated" | "booking_status_changed";
  bookingId: string;
  status: BookingStatus;
  operarioId?: string;
  timestamp: string;
}

/**
 * Subscribes to `sse:/api/v1/sse/bookings/{tenant_id}` for real-time
 * Kanban updates. Invalidates the bookings query on every event so
 * TanStack Query refetches the Kanban columns.
 *
 * Falls back to polling at 15s if SSE fails to connect within 5s.
 */
export function useBookingsRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenantId;

  const onEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data: BookingEvent = JSON.parse(event.data);

        // Invalidate the specific booking + the full list
        queryClient.invalidateQueries({
          queryKey: ["bookings", tenantId],
        });

        if (data.bookingId) {
          queryClient.invalidateQueries({
            queryKey: ["booking", data.bookingId],
          });
        }
      } catch {
        // If parse fails, still invalidate the list
        queryClient.invalidateQueries({
          queryKey: ["bookings", tenantId],
        });
      }
    },
    [queryClient, tenantId]
  );

  const { status, useFallbackPolling, pollingInterval } =
    useRealtimeChannel({
      channel: `/api/v1/sse/bookings/${tenantId}`,
      invalidateKeys: [["bookings", tenantId ?? ""]],
      onEvent,
      enabled: !!tenantId,
    });

  return {
    /** SSE connection status for the ConnectionIndicator */
    connectionStatus: status as ConnectionStatus,
    /** Pass to TanStack Query's refetchInterval as fallback */
    pollingInterval,
    /** Whether we're in fallback polling mode */
    useFallbackPolling,
  };
}
