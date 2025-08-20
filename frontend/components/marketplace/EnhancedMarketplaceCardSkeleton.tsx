import { cn } from "@/lib/utils/classNames"

interface EnhancedMarketplaceCardSkeletonProps {
  className?: string
  variant?: "default" | "compact" | "featured"
}

export default function EnhancedMarketplaceCardSkeleton({
  className = "",
  variant = "default",
}: EnhancedMarketplaceCardSkeletonProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse",
        variant === "featured" && "ring-2 ring-blue-200",
        className,
      )}
    >
      {/* Image Skeleton */}
      <div className="relative aspect-[5/4] bg-gray-200 rounded-t-xl">
        {/* Category Badge Skeleton */}
        <div className="absolute top-2 left-2 w-12 h-4 bg-gray-300 rounded-full"></div>

        {/* Like Button Skeleton */}
        <div className="absolute top-2 right-2 w-6 h-6 bg-gray-300 rounded-full"></div>

        {/* Condition Badge Skeleton */}
        <div className="absolute bottom-2 left-2 w-10 h-4 bg-gray-300 rounded-full"></div>

        {/* Rating Badge Skeleton */}
        <div className="absolute bottom-2 right-2 w-10 h-4 bg-gray-300 rounded-full"></div>
      </div>

      {/* Content Skeleton */}
      <div className="p-1.5">
        {/* Title Skeleton */}
        <div className="space-y-1 mb-1">
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>

        {/* Price and Type Skeleton */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <div className="h-4 w-12 bg-gray-200 rounded"></div>
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 w-10 bg-gray-200 rounded-full"></div>
        </div>

        {/* Description Skeleton */}
        {variant !== "compact" && (
          <div className="space-y-1 mb-1">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        )}

        {/* Location Skeleton */}
        <div className="flex items-center mb-0.5">
          <div className="w-3 h-3 bg-gray-200 rounded mr-1"></div>
          <div className="h-3 w-16 bg-gray-200 rounded"></div>
        </div>

        {/* Seller Skeleton */}
        {variant !== "compact" && (
          <div className="flex items-center mb-0.5">
            <div className="w-3 h-3 bg-gray-200 rounded mr-1"></div>
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
          </div>
        )}

        {/* Endorsements Skeleton */}
        {variant !== "compact" && (
          <div className="flex items-center mb-0.5">
            <div className="flex items-center mr-3">
              <div className="w-3 h-3 bg-gray-200 rounded mr-1"></div>
              <div className="h-3 w-3 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-200 rounded mr-1"></div>
              <div className="h-3 w-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        )}

        {/* Footer Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <div className="h-3 w-4 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <div className="h-3 w-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
