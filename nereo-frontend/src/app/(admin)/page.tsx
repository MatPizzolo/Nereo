"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useBranch } from "@/hooks/use-branch";
import { useAnalyticsRealtime } from "@/hooks/use-analytics-realtime";
import { KPICards } from "@/components/admin/dashboard/kpi-cards";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import type {
  DashboardKPIs,
  RevenueDataPoint,
  ChurnDataPoint,
  AtRiskSubscriber,
  RevenueProjection,
  WeatherData,
} from "@/lib/types";
import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Lazy load Recharts-heavy components — they add ~200KB to the bundle
const RevenueChart = dynamic(
  () => import("@/components/admin/dashboard/revenue-chart").then((m) => ({ default: m.RevenueChart })),
  { loading: () => <LoadingSkeleton variant="card-grid" columns={1} />, ssr: false }
);
const ChurnRetention = dynamic(
  () => import("@/components/admin/dashboard/churn-retention").then((m) => ({ default: m.ChurnRetention })),
  { loading: () => <LoadingSkeleton variant="table" rows={5} />, ssr: false }
);
const RevenueProjectionChart = dynamic(
  () => import("@/components/admin/dashboard/revenue-projection").then((m) => ({ default: m.RevenueProjectionChart })),
  { loading: () => <LoadingSkeleton variant="card-grid" columns={1} />, ssr: false }
);
const WeatherWidget = dynamic(
  () => import("@/components/admin/dashboard/weather-widget").then((m) => ({ default: m.WeatherWidget })),
  { loading: () => <LoadingSkeleton variant="form" rows={4} />, ssr: false }
);

export default function AdminDashboardPage() {
  const { selectedBranchId } = useBranch();
  const { pollingInterval } = useAnalyticsRealtime();
  const [revenuePeriod, setRevenuePeriod] = useState("month");
  const queryClient = useQueryClient();

  // Prefetch critical data on mount so subsequent navigations are instant
  useEffect(() => {
    const branchParam = selectedBranchId ?? "";
    queryClient.prefetchQuery({
      queryKey: ["analytics", "kpis", selectedBranchId],
      queryFn: () => api.get(`/api/v1/analytics/kpis?branch_id=${branchParam}`),
      staleTime: 30_000,
    });
    queryClient.prefetchQuery({
      queryKey: ["analytics", "revenue", selectedBranchId, "month"],
      queryFn: () => api.get(`/api/v1/analytics/revenue?branch_id=${branchParam}&period=month`),
      staleTime: 60_000,
    });
    queryClient.prefetchQuery({
      queryKey: ["subscribers", selectedBranchId],
      queryFn: () => api.get(`/api/v1/subscribers?branch_id=${branchParam}`),
      staleTime: 60_000,
    });
  }, [queryClient, selectedBranchId]);

  // KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ["analytics", "kpis", selectedBranchId],
    queryFn: () =>
      api.get(`/api/v1/analytics/kpis?branch_id=${selectedBranchId ?? ""}`),
    refetchInterval: pollingInterval || undefined,
  });

  // Revenue chart data
  const { data: revenueData = [] } = useQuery<RevenueDataPoint[]>({
    queryKey: ["analytics", "revenue", selectedBranchId, revenuePeriod],
    queryFn: () =>
      api.get(
        `/api/v1/analytics/revenue?branch_id=${selectedBranchId ?? ""}&period=${revenuePeriod}`
      ),
    refetchInterval: pollingInterval || undefined,
  });

  // Churn data
  const { data: churnData = [] } = useQuery<ChurnDataPoint[]>({
    queryKey: ["analytics", "churn", selectedBranchId],
    queryFn: () =>
      api.get(`/api/v1/analytics/churn?branch_id=${selectedBranchId ?? ""}`),
    refetchInterval: pollingInterval || undefined,
  });

  // At-risk subscribers
  const { data: atRisk = [] } = useQuery<AtRiskSubscriber[]>({
    queryKey: ["analytics", "at-risk", selectedBranchId],
    queryFn: () =>
      api.get(
        `/api/v1/analytics/at-risk?branch_id=${selectedBranchId ?? ""}`
      ),
    refetchInterval: pollingInterval || undefined,
  });

  // Revenue projections
  const { data: projections = [] } = useQuery<RevenueProjection[]>({
    queryKey: ["analytics", "projections", selectedBranchId],
    queryFn: () =>
      api.get(
        `/api/v1/analytics/projections?branch_id=${selectedBranchId ?? ""}`
      ),
  });

  // Weather
  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["weather", selectedBranchId],
    queryFn: () =>
      api.get(`/api/v1/weather?branch_id=${selectedBranchId ?? ""}`),
    staleTime: 10 * 60 * 1000, // 10 min
  });

  // MRR = active subscribers × avg plan price (from KPIs)
  const mrr = kpis ? kpis.activeSubscribers * kpis.avgTicket : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de tu lavadero en tiempo real
        </p>
      </div>

      {/* KPI Cards */}
      {kpisLoading || !kpis ? (
        <LoadingSkeleton variant="card-grid" columns={4} />
      ) : (
        <KPICards data={kpis} />
      )}

      {/* Revenue chart + Weather widget — each in its own Suspense */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<LoadingSkeleton variant="card-grid" columns={1} />}>
            <RevenueChart
              data={revenueData}
              onPeriodChange={setRevenuePeriod}
            />
          </Suspense>
        </div>
        <Suspense fallback={<LoadingSkeleton variant="form" rows={4} />}>
          <div>
            {weather ? (
              <WeatherWidget data={weather} />
            ) : (
              <LoadingSkeleton variant="form" rows={4} />
            )}
          </div>
        </Suspense>
      </div>

      {/* Churn & Retention + Revenue Projection — independent Suspense */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<LoadingSkeleton variant="table" rows={5} />}>
          <ChurnRetention
            churnData={churnData}
            atRiskSubscribers={atRisk}
          />
        </Suspense>
        <Suspense fallback={<LoadingSkeleton variant="card-grid" columns={1} />}>
          <RevenueProjectionChart data={projections} mrr={mrr} />
        </Suspense>
      </div>
    </div>
  );
}
