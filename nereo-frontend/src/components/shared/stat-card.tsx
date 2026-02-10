import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 text-card-foreground shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold">{value}</p>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              isPositive ? "text-[var(--status-active)]" : "text-[var(--status-expired)]"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {trend?.label && (
        <p className="mt-1 text-xs text-muted-foreground">{trend.label}</p>
      )}
    </div>
  );
}
