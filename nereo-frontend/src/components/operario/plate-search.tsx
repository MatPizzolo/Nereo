"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Booking } from "@/lib/booking-types";
import { cn } from "@/lib/utils";

export interface PlateSearchProps {
  onSelect: (booking: Booking) => void;
}

export function PlateSearch({ onSelect }: PlateSearchProps) {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const [query, setQuery] = useState("");

  // Prefetch today's bookings
  const { data: todayBookings = [] } = useQuery<Booking[]>({
    queryKey: ["bookings", "today", user?.tenantId, selectedBranchId],
    queryFn: () =>
      api.get(
        `/api/v1/bookings?tenant_id=${user?.tenantId ?? ""}&branch_id=${selectedBranchId ?? ""}&date=today&status=confirmed`
      ),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toUpperCase();
    return todayBookings.filter(
      (b) =>
        b.plate.toUpperCase().includes(q) ||
        b.customerName.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, todayBookings]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Patente o nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 text-lg min-h-[48px] uppercase"
          autoFocus
          autoComplete="off"
        />
      </div>

      {query.length >= 2 && (
        <div className="space-y-1">
          {filtered.length > 0 ? (
            filtered.map((booking) => (
              <button
                key={booking.id}
                onClick={() => onSelect(booking)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-colors",
                  "hover:bg-muted/50 active:bg-muted"
                )}
              >
                <div>
                  <span className="text-lg font-bold uppercase">
                    {booking.plate}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {booking.customerName}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{booking.serviceType}</p>
                  <p>
                    {new Date(booking.checkedInAt).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sin resultados para &quot;{query}&quot;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
