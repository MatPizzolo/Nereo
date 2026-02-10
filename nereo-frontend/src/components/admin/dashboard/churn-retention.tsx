"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { MessageCircle, AlertTriangle } from "lucide-react";
import type { ChurnDataPoint, AtRiskSubscriber } from "@/lib/types";
import Link from "next/link";

export interface ChurnRetentionProps {
  churnData: ChurnDataPoint[];
  atRiskSubscribers: AtRiskSubscriber[];
  churnTarget?: number;
}

export function ChurnRetention({
  churnData,
  atRiskSubscribers,
  churnTarget = 5,
}: ChurnRetentionProps) {
  return (
    <div className="space-y-6">
      {/* Churn trend chart */}
      <div className="rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">Churn Rate mensual</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={churnData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              className="text-muted-foreground"
            />
            <Tooltip
              formatter={((value: number) => [`${(value ?? 0).toFixed(1)}%`, "Churn"]) as never}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--card)",
              }}
            />
            <ReferenceLine
              y={churnTarget}
              stroke="var(--status-expired)"
              strokeDasharray="5 5"
              label={{
                value: `Meta: ${churnTarget}%`,
                position: "right",
                fill: "var(--status-expired)",
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="churnRate"
              stroke="var(--chart-3)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* At-risk subscribers table */}
      <div className="rounded-lg border p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[var(--status-pending)]" />
          <h3 className="text-lg font-semibold">Suscriptores en riesgo</h3>
          <span className="ml-auto text-sm text-muted-foreground">
            {atRiskSubscribers.length} cliente{atRiskSubscribers.length !== 1 ? "s" : ""}
          </span>
        </div>

        {atRiskSubscribers.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay suscriptores en riesgo actualmente
          </p>
        ) : (
          <div className="space-y-2">
            {atRiskSubscribers.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/suscriptores/${sub.id}`}
                    className="font-medium hover:underline"
                  >
                    {sub.fullName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {sub.plan} ·{" "}
                    {sub.riskReason === "no_wash_15d"
                      ? `${sub.daysSinceLastWash} días sin lavar`
                      : `Pago vence ${new Date(sub.renewalDate).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(
                      `https://wa.me/${sub.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${sub.fullName}! Te escribimos desde el lavadero.`)}`,
                      "_blank"
                    );
                  }}
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  WhatsApp
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
