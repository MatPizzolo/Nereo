import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function AuthLoading() {
  return <LoadingSkeleton variant="form" rows={3} />;
}
