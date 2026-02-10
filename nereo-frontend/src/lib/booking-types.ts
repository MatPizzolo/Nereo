export type BookingStatus = "waiting" | "washing" | "ready";

export interface Booking {
  id: string;
  subscriberId?: string;
  customerName: string;
  plate: string;
  vehicleModel?: string;
  serviceType: string;
  status: BookingStatus;
  assignedTo?: string;
  checkedInAt: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  branchId: string;
  tenantId: string;
}

export const KANBAN_COLUMNS: { id: BookingStatus; label: string }[] = [
  { id: "waiting", label: "En Espera" },
  { id: "washing", label: "Lavando" },
  { id: "ready", label: "Listo para Retirar" },
];

/** Minutes elapsed since a given ISO date */
export function minutesElapsed(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
}

/** Color class for time badge: green < 30min, yellow < 60min, red > 60min */
export function timeBadgeColor(minutes: number): string {
  if (minutes < 30) return "bg-[var(--status-active)] text-white";
  if (minutes < 60) return "bg-[var(--status-pending)] text-black";
  return "bg-[var(--status-expired)] text-white";
}
