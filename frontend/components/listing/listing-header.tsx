"use client"

import { ArrowLeft, Heart, Share, Eye, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ListingHeaderProps {
  kosherType?: string
  kosherAgency?: string
  shareCount?: number
  onBack?: () => void
  onFavorite?: () => void
  isFavorited?: boolean
}

export function ListingHeader({ 
  title, 
  kosherType, 
  kosherAgency, 
  shareCount,
  onBack, 
  onFavorite, 
  isFavorited = false 
}: ListingHeaderProps) {
  return (
    <div className="space-y-2 flex justify-center">
      {/* Single header bar with back, kosher info, stats, and action buttons */}
      <div className="inline-flex items-center gap-2 p-2 sm:p-3 px-3 sm:px-4 bg-white/80 backdrop-blur-sm rounded-full mt-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 hover:bg-white/50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Kosher info and stats in the middle */}
        <div className="flex items-center gap-2">
          {/* Kosher info */}
          {kosherType && (
            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
              {kosherType}
            </span>
          )}
          {kosherAgency && (
            <span className="text-xs text-gray-600">
              {kosherAgency}
            </span>
          )}

          {/* Stats */}
          {shareCount !== undefined && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Check out this restaurant!',
                    url: window.location.href
                  }).catch(console.error);
                } else {
                  // Fallback: copy to clipboard
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('Link copied to clipboard!');
                  }).catch(() => {
                    // Final fallback: prompt
                    prompt('Copy this link:', window.location.href);
                  });
                }
              }}
              className="flex items-center gap-1 text-xs text-gray-600 h-auto p-1 hover:bg-white/50 transition-colors rounded"
            >
              <Share className="h-3 w-3" />
              <span>{shareCount.toLocaleString()}</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onFavorite}
            className="h-8 w-8 hover:bg-white/50 transition-colors group"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${isFavorited ? "fill-red-500 text-red-500" : "text-gray-700 group-hover:fill-red-500 group-hover:text-red-500"}`}
            />
          </Button>
        </div>
      </div>
    </div>
  )
}
