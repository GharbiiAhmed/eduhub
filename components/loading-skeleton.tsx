export function CourseSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg bg-muted animate-pulse h-48" />
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg bg-muted animate-pulse h-24" />
        ))}
      </div>
      <div className="rounded-lg bg-muted animate-pulse h-96" />
    </div>
  )
}

export function CardSkeleton() {
  return <div className="rounded-lg bg-muted animate-pulse h-32" />
}
