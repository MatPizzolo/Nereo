"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

interface UseRealtimeChannelOptions {
  /** SSE endpoint path, e.g. `/api/v1/sse/bookings/{tenantId}` */
  channel: string;
  /** TanStack Query keys to invalidate when an event arrives */
  invalidateKeys?: string[][];
  /** Custom handler for incoming events */
  onEvent?: (event: MessageEvent) => void;
  /** Whether the connection is enabled (default: true) */
  enabled?: boolean;
  /** Fallback polling interval in ms if SSE fails (default: 15000) */
  fallbackPollingInterval?: number;
  /** Timeout in ms before falling back to polling (default: 5000) */
  connectionTimeout?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const MAX_RETRY_DELAY = 30000;

/**
 * Hook for real-time updates via Server-Sent Events (SSE).
 * Falls back to TanStack Query polling if SSE fails to connect within timeout.
 */
export function useRealtimeChannel({
  channel,
  invalidateKeys = [],
  onEvent,
  enabled = true,
  fallbackPollingInterval = 15000,
  connectionTimeout = 5000,
}: UseRealtimeChannelOptions) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [useFallbackPolling, setUseFallbackPolling] = useState(false);
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const url = `${API_BASE_URL}${channel}`;
    setStatus("connecting");

    // Set connection timeout — if SSE doesn't connect, fall back to polling
    timeoutRef.current = setTimeout(() => {
      if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
        eventSourceRef.current?.close();
        setUseFallbackPolling(true);
        setStatus("disconnected");
      }
    }, connectionTimeout);

    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus("connected");
      retryCountRef.current = 0;
      setUseFallbackPolling(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    es.onmessage = (event) => {
      // Invalidate relevant TanStack Query caches
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      onEvent?.(event);
    };

    es.onerror = () => {
      es.close();
      setStatus("reconnecting");

      // Exponential backoff
      const delay = Math.min(1000 * 2 ** retryCountRef.current, MAX_RETRY_DELAY);
      retryCountRef.current += 1;

      setTimeout(() => {
        connect();
      }, delay);
    };
  }, [channel, enabled, connectionTimeout, invalidateKeys, onEvent, queryClient]);

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [connect]);

  return {
    status,
    /** True if SSE failed and we're using polling as fallback */
    useFallbackPolling,
    /** Polling interval to pass to TanStack Query's refetchInterval (0 if SSE is active) */
    pollingInterval: useFallbackPolling ? fallbackPollingInterval : 0,
  };
}
