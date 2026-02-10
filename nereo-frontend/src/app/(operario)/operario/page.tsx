"use client";

import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

// Lazy load the Kanban board (dnd-kit is heavy, SSR not needed)
const KanbanBoard = dynamic(
  () =>
    import("@/components/operario/kanban/kanban-board").then((m) => ({
      default: m.KanbanBoard,
    })),
  { loading: () => <LoadingSkeleton variant="kanban" />, ssr: false }
);

export default function OperarioPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Lavados del día</h1>
      <KanbanBoard />
    </div>
  );
}
