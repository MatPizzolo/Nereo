"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Play, CheckCircle, AlertTriangle, MessageCircle } from "lucide-react";
import type { Booking, BookingStatus } from "@/lib/booking-types";
import { minutesElapsed, timeBadgeColor } from "@/lib/booking-types";
import { motion } from "framer-motion";

export interface KanbanCardProps {
  booking: Booking;
  onAction: (bookingId: string, action: "start" | "complete" | "problem") => void;
  onWhatsApp?: (booking: Booking) => void;
}

export function KanbanCard({ booking, onAction, onWhatsApp }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: booking.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const minutes = minutesElapsed(booking.checkedInAt);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "rounded-lg border-2 bg-card p-3 shadow-sm touch-manipulation select-none",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        "active:scale-[0.98] transition-transform"
      )}
    >
      {/* Header: plate + time badge */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold uppercase tracking-wider">
          {booking.plate}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold",
            timeBadgeColor(minutes)
          )}
        >
          {minutes} min
        </span>
      </div>

      {/* Info */}
      <div className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{booking.customerName}</p>
        {booking.vehicleModel && <p>{booking.vehicleModel}</p>}
        <p>{booking.serviceType}</p>
      </div>

      {/* Actions — large touch targets (min 48x48) */}
      <div className="mt-3 flex gap-2">
        {booking.status === "waiting" && (
          <Button
            size="lg"
            className="flex-1 min-h-[48px] text-base font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onAction(booking.id, "start");
            }}
          >
            <Play className="mr-1.5 h-5 w-5" />
            Empezar
          </Button>
        )}
        {booking.status === "washing" && (
          <Button
            size="lg"
            className="flex-1 min-h-[48px] text-base font-semibold bg-[var(--status-active)] hover:bg-[var(--status-active)]/90"
            onClick={(e) => {
              e.stopPropagation();
              onAction(booking.id, "complete");
            }}
          >
            <CheckCircle className="mr-1.5 h-5 w-5" />
            Listo
          </Button>
        )}
        {booking.status === "ready" && onWhatsApp && (
          <Button
            size="lg"
            variant="outline"
            className="flex-1 min-h-[48px] text-base font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(booking);
            }}
          >
            <MessageCircle className="mr-1.5 h-5 w-5" />
            WhatsApp
          </Button>
        )}
        {booking.status !== "ready" && (
          <Button
            size="lg"
            variant="outline"
            className="min-h-[48px] min-w-[48px] text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onAction(booking.id, "problem");
            }}
          >
            <AlertTriangle className="h-5 w-5" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
