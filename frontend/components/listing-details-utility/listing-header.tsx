"use client"

import { ArrowLeft, Heart, Share, Eye, Star } from "lucide-react"
import { Button } from "@/components/ui-listing-utility/button"

interface ListingHeaderProps {
  kosherType?: string
  kosherAgency?: string
  kosherAgencyWebsite?: string
  shareCount?: number
  onBack?: () => void
  onFavorite?: () => void
  isFavorited?: boolean
  tags?: string[]
}

export function ListingHeader({ 
  kosherType, 
  kosherAgency, 
  kosherAgencyWebsite,
  shareCount,
  onBack, 
  onFavorite, 
  isFavorited = false,
  tags = []
}: ListingHeaderProps) {
  const handleAgencyClick = () => {
    // First check if there's a specific website provided
    if (kosherAgencyWebsite) {
      // Open in new tab
      window.open(kosherAgencyWebsite, '_blank', 'noopener,noreferrer')
      return
    }
    
    // If no specific website, check for known agencies
    if (kosherAgency) {
      const lowerAgency = kosherAgency.toLowerCase()
      
      // Check for ORB (Orthodox Rabbinical Board) variations
      if (lowerAgency.includes('orb') || 
          lowerAgency.includes('orthodox rabbinical board')) {
        window.open('https://www.orbkosher.com/', '_blank', 'noopener,noreferrer')
        return
      }
      
      // Check for Kosher Miami variations
      if (lowerAgency.includes('kosher miami') || 
          lowerAgency.includes('vaad hakashrus') ||
          lowerAgency.includes('vaad') ||
          lowerAgency.includes('miami-dade')) {
        window.open('https://koshermiami.org/', '_blank', 'noopener,noreferrer')
        return
      }
    }
  }

  return (
    <div className="space-y-2 flex justify-center">
      {/* Single header bar with back, tags, kosher info, stats, and action buttons */}
      <div className="inline-flex items-center gap-1 p-1 sm:p-2 px-2 sm:px-3 bg-white rounded-full mt-6 sm:mt-8">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 hover:bg-white/50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Kosher info and stats in the middle */}
        <div className="flex items-center gap-3 self-center">
          {/* Kosher info */}
          {kosherType && (
            <span className={`text-sm font-medium px-1 py-0.5 rounded-full flex items-center ${
              kosherType.toLowerCase() === 'meat' ? 'text-red-600' :
              kosherType.toLowerCase() === 'dairy' ? 'text-blue-600' :
              kosherType.toLowerCase() === 'parve' || kosherType.toLowerCase() === 'pareve' ? 'text-orange-600' :
              'text-gray-600'
            }`}>
              {kosherType}
            </span>
          )}
          {kosherAgency && (
            (() => {
              // Check if agency should be clickable
              const lowerAgency = kosherAgency.toLowerCase()
              const isClickable = kosherAgencyWebsite || 
                lowerAgency.includes('orb') || 
                lowerAgency.includes('orthodox rabbinical board') ||
                lowerAgency.includes('kosher miami') || 
                lowerAgency.includes('vaad hakashrus') ||
                lowerAgency.includes('vaad') ||
                lowerAgency.includes('miami-dade')
              
              return isClickable ? (
                <button
                  onClick={handleAgencyClick}
                  className="text-sm text-gray-600 hover:text-blue-600 hover:underline transition-colors cursor-pointer flex items-center"
                >
                  {kosherAgency}
                </button>
              ) : (
                <span className="text-sm text-gray-600 flex items-center">
                  {kosherAgency}
                </span>
              )
            })()
          )}

          {/* Stats */}
          {shareCount !== undefined && (
            <button
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
              className="flex items-center justify-center text-black bg-white h-8 w-8 hover:bg-gray-50 transition-colors rounded -mt-1"
            >
              <Share className="h-4 w-4" />
            </button>
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
