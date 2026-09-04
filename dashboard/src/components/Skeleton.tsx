export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-neutral-800 rounded-sm ${className}`} />
);

export const StatCardSkeleton = () => (
  <div className="border border-border bg-panel rounded-sm px-3 py-2">
    <Skeleton className="h-3 w-16 mb-2" />
    <Skeleton className="h-6 w-12" />
  </div>
);
