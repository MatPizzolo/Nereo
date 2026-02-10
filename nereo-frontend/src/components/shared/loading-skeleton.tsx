import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface LoadingSkeletonProps {
  variant: "table" | "card-grid" | "kanban" | "form";
  rows?: number;
  columns?: number;
  className?: string;
}

function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-6 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardGridSkeleton({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="rounded-lg border p-6 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function KanbanSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-4 overflow-x-auto", className)}>
      {Array.from({ length: 3 }).map((_, col) => (
        <div key={col} className="min-w-[280px] flex-1 space-y-3">
          <Skeleton className="h-8 w-full rounded-lg" />
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FormSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

export function LoadingSkeleton({
  variant,
  rows,
  columns,
  className,
}: LoadingSkeletonProps) {
  switch (variant) {
    case "table":
      return <TableSkeleton rows={rows} className={className} />;
    case "card-grid":
      return <CardGridSkeleton columns={columns} className={className} />;
    case "kanban":
      return <KanbanSkeleton className={className} />;
    case "form":
      return <FormSkeleton rows={rows} className={className} />;
  }
}
