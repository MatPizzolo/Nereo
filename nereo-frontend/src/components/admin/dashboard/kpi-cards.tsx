"use client";

import { StatCard } from "@/components/shared/stat-card";
import { DollarSign, Users, TrendingDown, Receipt } from "lucide-react";
import { formatARS } from "@/components/shared/currency-input";
import type { DashboardKPIs } from "@/lib/types";

export interface KPICardsProps {
  data: DashboardKPIs;
}

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Ingresos del mes"
        value={`$${formatARS(data.monthlyRevenue)}`}
        icon={DollarSign}
        trend={{
          value: data.revenueChange,
          label: "vs. mes anterior",
        }}
      />
      <StatCard
        title="Suscriptores activos"
        value={data.activeSubscribers}
        icon={Users}
        trend={{
          value: data.subscribersChange,
          label: "vs. mes anterior",
        }}
      />
      <StatCard
        title="Churn Rate"
        value={`${data.churnRate.toFixed(1)}%`}
        icon={TrendingDown}
        trend={{
          value: -data.churnChange,
          label: "vs. mes anterior",
        }}
      />
      <StatCard
        title="Ticket promedio"
        value={`$${formatARS(data.avgTicket)}`}
        icon={Receipt}
        trend={{
          value: data.avgTicketChange,
          label: "vs. mes anterior",
        }}
      />
    </div>
  );
}
