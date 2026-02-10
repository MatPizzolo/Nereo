"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { formatARS } from "@/components/shared/currency-input";
import type { RevenueDataPoint } from "@/lib/types";

type Period = "week" | "month" | "quarter" | "year";

export interface RevenueChartProps {
  data: RevenueDataPoint[];
  onPeriodChange?: (period: Period) => void;
}

export function RevenueChart({ data, onPeriodChange }: RevenueChartProps) {
  const [period, setPeriod] = useState<Period>("month");

  const handlePeriodChange = (value: string) => {
    const p = value as Period;
    setPeriod(p);
    onPeriodChange?.(p);
  };

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Ingresos</h3>
        <Tabs value={period} onValueChange={handlePeriodChange}>
          <TabsList>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mes</TabsTrigger>
            <TabsTrigger value="quarter">Trimestre</TabsTrigger>
            <TabsTrigger value="year">Año</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
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
            formatter={((value: number, name: string) => [
              `$${formatARS(value ?? 0)}`,
              name === "subscriptionRevenue"
                ? "Suscripciones"
                : name === "singleWashRevenue"
                  ? "Lavados únicos"
                  : "Total",
            ]) as never}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card)",
            }}
          />
          <Legend
            formatter={(value) =>
              value === "subscriptionRevenue"
                ? "Suscripciones"
                : value === "singleWashRevenue"
                  ? "Lavados únicos"
                  : "Total"
            }
          />
          <Bar
            dataKey="subscriptionRevenue"
            stackId="revenue"
            fill="var(--chart-1)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="singleWashRevenue"
            stackId="revenue"
            fill="var(--chart-2)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="var(--chart-5)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
