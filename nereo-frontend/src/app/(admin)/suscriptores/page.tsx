"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type RowSelectionState,
  type ExpandedState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSubscriberColumns } from "@/components/admin/subscribers/subscriber-columns";
import { SubscriberFilters } from "@/components/admin/subscribers/subscriber-filters";
import {
  SubscriberBulkActions,
  exportSubscribersCSV,
} from "@/components/admin/subscribers/subscriber-bulk-actions";
import { NewSubscriberModal } from "@/components/admin/subscribers/new-subscriber-modal";
import { WashHistory } from "@/components/admin/subscribers/wash-history";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronR, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useBranch } from "@/hooks/use-branch";
import { useSubscriberMutations } from "@/hooks/use-subscriber-mutations";
import type { MembershipStatus, Plan, Subscriber, WashRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SubscribersPage() {
  const { selectedBranchId } = useBranch();

  // Queries
  const { data: subscribers = [], isLoading } = useQuery<Subscriber[]>({
    queryKey: ["subscribers", selectedBranchId],
    queryFn: () =>
      api.get(`/api/v1/subscribers?branch_id=${selectedBranchId ?? ""}`),
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => api.get("/api/v1/plans"),
  });

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<string | "all">("all");

  // Modal state
  const [showNewModal, setShowNewModal] = useState(false);

  // Apply filters
  const filteredData = useMemo(() => {
    let data = subscribers;
    if (statusFilter !== "all") {
      data = data.filter((s) => s.status === statusFilter);
    }
    if (planFilter !== "all") {
      data = data.filter((s) => s.plan.id === planFilter);
    }
    return data;
  }, [subscribers, statusFilter, planFilter]);

  const columns = useMemo(
    () =>
      getSubscriberColumns((subscriber) => {
        const url = `https://wa.me/${subscriber.phone.replace(/\D/g, "")}`;
        window.open(url, "_blank");
      }),
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getRowCanExpand: () => true,
    state: { sorting, columnFilters, rowSelection, expanded, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    initialState: { pagination: { pageSize: 15 } },
  });

  const selectedSubscribers = table
    .getSelectedRowModel()
    .rows.map((r) => r.original);

  const { createMutation } = useSubscriberMutations();

  const handleNewSubscriber = useCallback(async (data: Record<string, unknown>) => {
    await createMutation.mutateAsync(data);
  }, [createMutation]);

  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setPlanFilter("all");
  }, []);

  if (isLoading) {
    return <LoadingSkeleton variant="table" rows={10} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suscriptores</h1>
          <p className="text-sm text-muted-foreground">
            {subscribers.length} suscriptor{subscribers.length !== 1 ? "es" : ""} en total
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo suscriptor
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <SubscriberFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          planFilter={planFilter}
          onPlanChange={setPlanFilter}
          plans={plans}
          onClear={handleClearFilters}
        />
      </div>

      {/* Bulk actions */}
      <SubscriberBulkActions
        selectedCount={selectedSubscribers.length}
        onSendWhatsApp={() => {
          selectedSubscribers.forEach((s) => {
            window.open(
              `https://wa.me/${s.phone.replace(/\D/g, "")}`,
              "_blank"
            );
          });
        }}
        onExportCSV={() => exportSubscribersCSV(selectedSubscribers)}
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                <TableHead className="w-8" />
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <>
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => row.toggleExpanded()}
                      >
                        {row.getIsExpanded() ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronR className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow key={`${row.id}-expanded`}>
                      <TableCell colSpan={columns.length + 1} className="bg-muted/30 px-8">
                        <SubscriberWashHistoryRow subscriberId={row.original.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-24">
                  <EmptyState
                    title="Sin suscriptores"
                    description="Agregá tu primer suscriptor para empezar"
                    action={{ label: "Nuevo suscriptor", onClick: () => setShowNewModal(true) }}
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} resultado(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New subscriber modal */}
      <NewSubscriberModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        plans={plans}
        onSubmit={handleNewSubscriber}
      />
    </div>
  );
}

/** Inline component for fetching and displaying wash history in expanded row */
function SubscriberWashHistoryRow({ subscriberId }: { subscriberId: string }) {
  const { data: records = [], isLoading } = useQuery<WashRecord[]>({
    queryKey: ["wash-history", subscriberId],
    queryFn: () => api.get(`/api/v1/subscribers/${subscriberId}/washes`),
  });

  if (isLoading) {
    return <LoadingSkeleton variant="table" rows={3} />;
  }

  return <WashHistory records={records} />;
}
