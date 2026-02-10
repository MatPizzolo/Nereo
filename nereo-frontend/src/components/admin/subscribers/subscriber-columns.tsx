"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Subscriber } from "@/lib/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal, MessageCircle, Eye } from "lucide-react";
import { formatPhoneDisplay } from "@/components/shared/phone-input";
import Link from "next/link";

export function getSubscriberColumns(
  onWhatsApp?: (subscriber: Subscriber) => void
): ColumnDef<Subscriber>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "fullName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/admin/suscriptores/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.getValue("fullName")}
        </Link>
      ),
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => formatPhoneDisplay(row.getValue("phone")),
    },
    {
      accessorKey: "plan",
      header: "Plan",
      cell: ({ row }) => {
        const plan = row.original.plan;
        return <span className="text-sm">{plan.name}</span>;
      },
      filterFn: (row, _id, filterValue) => {
        return row.original.plan.id === filterValue;
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge status={row.getValue("status")} />
      ),
      filterFn: (row, _id, filterValue) => {
        return row.getValue("status") === filterValue;
      },
    },
    {
      accessorKey: "renewalDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Renovación
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("renewalDate"));
        return date.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      },
    },
    {
      accessorKey: "lastWashDate",
      header: "Último lavado",
      cell: ({ row }) => {
        const val = row.getValue("lastWashDate") as string | undefined;
        if (!val) return <span className="text-muted-foreground">—</span>;
        const date = new Date(val);
        return date.toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "short",
        });
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const subscriber = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/suscriptores/${subscriber.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalle
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onWhatsApp?.(subscriber)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Enviar WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
