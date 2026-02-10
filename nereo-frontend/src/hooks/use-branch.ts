"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "nereo-selected-branch";

export interface Branch {
  id: string;
  name: string;
}

/**
 * Manages the selected branch (sucursal) context.
 * When the branch changes, all TanStack Query caches are invalidated
 * so data refetches scoped to the new branch.
 */
export function useBranch() {
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(STORAGE_KEY);
    }
  );

  useEffect(() => {
    if (selectedBranchId) {
      localStorage.setItem(STORAGE_KEY, selectedBranchId);
    }
  }, [selectedBranchId]);

  const selectBranch = useCallback(
    (branchId: string) => {
      setSelectedBranchId(branchId);
      localStorage.setItem(STORAGE_KEY, branchId);
      // Invalidate all queries so they refetch with the new branch context
      queryClient.invalidateQueries();
    },
    [queryClient]
  );

  return {
    selectedBranchId,
    selectBranch,
  };
}
