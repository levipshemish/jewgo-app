"use client"

import { ArrowLeft, Heart, Share, Eye, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ListingHeaderProps {
  kosherType?: string
  kosherAgency?: string
  viewCount?: number
  shareCount?: number
  onBack?: () => void
  onFavorite?: () => void
  onShare?: () => void
  isFavorited?: boolean
}

export function ListingHeader({ 
  title, 
  kosherType, 
  kosherAgency, 
  viewCount, 
  shareCount,
  onBack, 
  onFavorite, 
  onShare, 
  isFavorited = false 
}: ListingHeaderProps) {
  return (
    <div className="space-y-2">
      {/* Single header bar with back, kosher info, stats, and action buttons */}
      <div className="flex items-center justify-between p-2 sm:p-3 px-3 sm:px-4 bg-white/80 backdrop-blur-sm rounded-full mx-2 sm:mx-4 mt-4 max-w-xs sm:max-w-sm">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 hover:bg-white/50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Kosher info and stats in the middle */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          {/* Kosher info */}
          <div className="flex items-center gap-2">
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
          </div>

          {/* Stats */}
          {(viewCount !== undefined || shareCount !== undefined) && (
            <div className="flex items-center gap-3">
              {viewCount !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Eye className="h-3 w-3" />
                  <span>{viewCount.toLocaleString()}</span>
                </div>
              )}
              {shareCount !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Share className="h-3 w-3" />
                  <span>{shareCount.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onFavorite}
            className="h-8 w-8 hover:bg-white/50 transition-colors"
          >
            <Heart
              className={`h-4 w-4 transition-all ${isFavorited ? "fill-red-500 text-red-500 scale-110" : "hover:scale-105"}`}
            />
          </Button>
          <Button variant="ghost" size="icon" onClick={onShare} className="h-8 w-8 hover:bg-white/50 transition-colors">
            <Share className="h-4 w-4 hover:scale-105 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  )
}
