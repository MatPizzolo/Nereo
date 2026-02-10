"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { Booking } from "@/lib/booking-types";
import { AnimatePresence } from "framer-motion";

export interface KanbanColumnProps {
  id: string;
  label: string;
  bookings: Booking[];
  onAction: (bookingId: string, action: "start" | "complete" | "problem") => void;
  onWhatsApp?: (booking: Booking) => void;
}

export function KanbanColumn({
  id,
  label,
  bookings,
  onAction,
  onWhatsApp,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border-2 bg-muted/30 p-3 transition-colors min-h-[200px]",
        isOver && "border-primary bg-primary/5"
      )}
    >
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold">{label}</h3>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold">
          {bookings.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext
        items={bookings.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {bookings.map((booking) => (
              <KanbanCard
                key={booking.id}
                booking={booking}
                onAction={onAction}
                onWhatsApp={onWhatsApp}
              />
            ))}
          </AnimatePresence>
          {bookings.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin vehículos
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
