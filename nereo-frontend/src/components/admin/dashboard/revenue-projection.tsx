"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatARS } from "@/components/shared/currency-input";
import type { RevenueProjection } from "@/lib/types";

export interface RevenueProjectionProps {
  data: RevenueProjection[];
  mrr: number;
}

export function RevenueProjectionChart({ data, mrr }: RevenueProjectionProps) {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Proyección de ingresos</h3>
          <p className="text-sm text-muted-foreground">Próximos 3 meses</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">MRR</p>
          <p className="text-2xl font-bold text-primary">${formatARS(mrr)}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `$${formatARS(v)}`}
            className="text-muted-foreground"
          />
          <Tooltip
            formatter={((value: number) => [
              `$${formatARS(value ?? 0)}`,
            ]) as never}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card)",
            }}
          />
          <Legend
            formatter={(value) =>
              value === "optimistic"
                ? "Optimista (0% churn)"
                : value === "realistic"
                  ? "Realista"
                  : "Pesimista (churn x2)"
            }
          />
          <Area
            type="monotone"
            dataKey="optimistic"
            stroke="var(--status-active)"
            fill="var(--status-active)"
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="realistic"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="pessimistic"
            stroke="var(--status-expired)"
            fill="var(--status-expired)"
            fillOpacity={0.1}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
