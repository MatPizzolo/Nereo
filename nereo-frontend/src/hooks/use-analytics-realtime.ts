"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useRealtimeChannel,
  type ConnectionStatus,
} from "@/hooks/use-realtime-channel";
import { useCallback } from "react";

export interface AnalyticsEvent {
  type:
    | "payment_processed"
    | "subscription_changed"
    | "booking_completed"
    | "kpi_updated";
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface DashboardKPIs {
  totalSubscribers: number;
  activeSubscribers: number;
  churnRate: number;
  monthlyRevenue: number;
  revenueChange: number;
  todayBookings: number;
  avgWashTime: number;
}

/**
 * Subscribes to `sse:/api/v1/sse/analytics/{tenant_id}` for real-time
 * Dashboard KPI updates. Uses `queryClient.setQueryData` for incremental
 * merge when possible, falling back to full invalidation.
 *
 * Falls back to polling at 15s if SSE fails to connect within 5s.
 */
export function useAnalyticsRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenantId;

  const onEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data: AnalyticsEvent = JSON.parse(event.data);

        switch (data.type) {
          case "kpi_updated": {
            // Incremental merge — update KPI data without full refetch
            const kpiPayload = data.payload as Partial<DashboardKPIs>;
            queryClient.setQueryData<DashboardKPIs>(
              ["analytics", "kpis", tenantId],
              (old) => {
                if (!old) return undefined;
                return { ...old, ...kpiPayload };
              }
            );
            break;
          }

          case "payment_processed": {
            // Invalidate revenue-related queries
            queryClient.invalidateQueries({
              queryKey: ["analytics", "kpis", tenantId],
            });
            queryClient.invalidateQueries({
              queryKey: ["analytics", "revenue", tenantId],
            });
            break;
          }

          case "subscription_changed": {
            // Invalidate subscriber + churn queries
            queryClient.invalidateQueries({
              queryKey: ["analytics", "kpis", tenantId],
            });
            queryClient.invalidateQueries({
              queryKey: ["subscribers", tenantId],
            });
            break;
          }

          case "booking_completed": {
            // Invalidate today's bookings count
            queryClient.invalidateQueries({
              queryKey: ["analytics", "kpis", tenantId],
            });
            break;
          }

          default: {
            // Unknown event type — invalidate all analytics
            queryClient.invalidateQueries({
              queryKey: ["analytics", tenantId],
            });
          }
        }
      } catch {
        // Parse error — full invalidation as safety net
        queryClient.invalidateQueries({
          queryKey: ["analytics", tenantId],
        });
      }
    },
    [queryClient, tenantId]
  );

  const { status, useFallbackPolling, pollingInterval } =
    useRealtimeChannel({
      channel: `/api/v1/sse/analytics/${tenantId}`,
      invalidateKeys: [["analytics", tenantId ?? ""]],
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
