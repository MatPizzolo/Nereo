import type { WashRecord } from "@/lib/types";
import { Clock, User, Droplets } from "lucide-react";

export interface WashHistoryProps {
  records: WashRecord[];
}

export function WashHistory({ records }: WashHistoryProps) {
  if (records.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Sin lavados registrados
      </p>
    );
  }

  return (
    <div className="space-y-2 py-2">
      {records.map((record) => (
        <div
          key={record.id}
          className="flex items-center gap-4 rounded-md border px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Droplets className="h-3.5 w-3.5" />
            <span>{record.serviceType}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{record.durationMinutes} min</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{record.operarioName}</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(record.date).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
