"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch, type Branch } from "@/hooks/use-branch";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BranchSelectorProps {
  branches: Branch[];
  className?: string;
}

export function BranchSelector({ branches, className }: BranchSelectorProps) {
  const { selectedBranchId, selectBranch } = useBranch();

  // Auto-select first branch if none selected
  const currentValue = selectedBranchId ?? branches[0]?.id ?? "";

  if (branches.length <= 1) return null;

  return (
    <Select value={currentValue} onValueChange={selectBranch}>
      <SelectTrigger className={cn("w-[200px]", className)}>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Seleccionar sucursal" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
