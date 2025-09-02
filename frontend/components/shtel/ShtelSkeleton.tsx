/**
 * Shtetl Skeleton Component
 * Provides consistent loading states to prevent layout shifts
 */

export function ShtelSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 rounded-lg h-48 mb-2"></div>
          <div className="bg-gray-200 h-4 rounded mb-2"></div>
          <div className="bg-gray-200 h-3 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
}

export function ShtelCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 rounded-lg h-48 mb-2"></div>
      <div className="bg-gray-200 h-4 rounded mb-2"></div>
      <div className="bg-gray-200 h-3 rounded w-3/4"></div>
    </div>
  );
}

export function ShtelListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShtelCardSkeleton key={i} />
      ))}
    </div>
  );
}
