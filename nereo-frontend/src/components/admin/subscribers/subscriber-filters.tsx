"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { MembershipStatus, Plan } from "@/lib/types";

export interface SubscriberFiltersProps {
  statusFilter: MembershipStatus | "all";
  onStatusChange: (status: MembershipStatus | "all") => void;
  planFilter: string | "all";
  onPlanChange: (planId: string | "all") => void;
  plans: Plan[];
  onClear: () => void;
}

export function SubscriberFilters({
  statusFilter,
  onStatusChange,
  planFilter,
  onPlanChange,
  plans,
  onClear,
}: SubscriberFiltersProps) {
  const hasFilters = statusFilter !== "all" || planFilter !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={statusFilter}
        onValueChange={(v) => onStatusChange(v as MembershipStatus | "all")}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="expired">Vencido</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
          <SelectItem value="paused">Pausado</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={planFilter}
        onValueChange={(v) => onPlanChange(v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los planes</SelectItem>
          {plans.map((plan) => (
            <SelectItem key={plan.id} value={plan.id}>
              {plan.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="mr-1 h-3 w-3" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
