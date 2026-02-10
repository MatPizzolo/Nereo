import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <LoadingSkeleton variant="card-grid" columns={4} />
      <LoadingSkeleton variant="table" rows={8} />
    </div>
  );
}
