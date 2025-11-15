import { DashboardSkeleton } from "@/components/loading-skeleton"

export function PageLoading() {
  return (
    <div className="space-y-8">
      <div className="h-32 bg-muted rounded-3xl animate-pulse" />
      <DashboardSkeleton />
    </div>
  )
}
