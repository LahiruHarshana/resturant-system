type LoadingSkeletonProps = {
  lines?: number;
};

export function LoadingSkeleton({ lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className="surface-card" role="status">
      <span className="sr-only">Loading</span>
      <div className="bg-muted h-5 w-40 animate-pulse rounded-full" />
      <div className="mt-5 grid gap-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            className="bg-muted h-4 animate-pulse rounded-full"
            key={index}
            style={{ width: `${92 - index * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}
