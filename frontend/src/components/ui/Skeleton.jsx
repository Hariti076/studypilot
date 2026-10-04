export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800 ${className}`} aria-hidden="true" />;
}

const CardSkeleton = ({ h = 'h-40' }) => (
  <div className="card">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className={`mt-4 w-full ${h}`} />
  </div>
);

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <CardSkeleton h="h-24" />
        <CardSkeleton h="h-24" />
        <CardSkeleton h="h-24" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CardSkeleton h="h-44" />
        </div>
        <CardSkeleton h="h-44" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <CardSkeleton h="h-64" />
        <CardSkeleton h="h-64" />
      </div>
    </div>
  );
}

export function PlannerSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Generating your plan">
      <div className="card flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <Skeleton className="h-4 w-12" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-3" role="status" aria-label="Loading progress">
      <div className="space-y-5 lg:col-span-2">
        <CardSkeleton h="h-40" />
        <CardSkeleton h="h-56" />
      </div>
      <div className="space-y-5">
        <CardSkeleton h="h-32" />
        <CardSkeleton h="h-32" />
      </div>
    </div>
  );
}

export function PageFallback() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="mt-6 h-64 w-full" />
    </div>
  );
}
