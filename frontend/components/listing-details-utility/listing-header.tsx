"use client"

import { ArrowLeft, Heart, Share, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ListingHeaderProps {
  kosherType?: string
  kosherAgency?: string
  kosherAgencyWebsite?: string
  shareCount?: number
  viewCount?: number
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
  viewCount,
  onBack, 
  onFavorite, 
  isFavorited = false,
  tags: _tags = []
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

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Check out this restaurant!',
          url: window.location.href
        })
        .catch(console.error)
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          alert('Link copied to clipboard!')
        })
        .catch(() => {
          prompt('Copy this link:', window.location.href)
        })
    }
  }

  return (
    <div className="flex justify-center px-4">
      {/* Header bar with consistent spacing and better visual hierarchy */}
      <div className="inline-flex items-center px-3 py-1.5 bg-white rounded-full mt-6 shadow-sm max-w-fit">
        {/* Back button */}
        {onBack && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="h-5 w-5 p-0 m-0 min-w-0 min-h-0 max-w-5 max-h-5 hover:bg-gray-100 transition-colors"
            style={{ padding: 0, margin: 0, minWidth: 0, minHeight: 0, maxWidth: '1.25rem', maxHeight: '1.25rem' }}
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
        )}

        {/* Kosher type */}
        {kosherType && (
          <>
            <div className="w-1.5" />
            <span className={`text-xs font-medium m-0 ${
              kosherType.toLowerCase() === 'meat' ? 'text-red-600' :
              kosherType.toLowerCase() === 'dairy' ? 'text-blue-600' :
              kosherType.toLowerCase() === 'parve' || kosherType.toLowerCase() === 'pareve' ? 'text-orange-600' :
              'text-gray-600'
            }`}>
              {kosherType}
            </span>
          </>
        )}

        {/* Kosher agency */}
        {kosherAgency && (
          <>
            <div className="w-1.5" />
            {(() => {
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
                  className="text-xs text-gray-600 hover:text-blue-600 underline transition-colors rounded p-0 m-0"
                >
                  {kosherAgency}
                </button>
              ) : (
                <span className="text-xs text-gray-600 m-0">
                  {kosherAgency}
                </span>
              )
            })()}
          </>
        )}

        {/* View count */}
        {viewCount !== undefined && viewCount >= 0 && (
          <>
            <div className="w-1.5" />
            <div className="flex items-center gap-1 text-gray-600 m-0">
              <Eye className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium">{viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}</span>
            </div>
          </>
        )}

        {/* Share button */}
        {shareCount !== undefined && (
          <>
            <div className="w-1.5" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-5 w-5 p-0 m-0 min-w-0 min-h-0 max-w-5 max-h-5 hover:bg-gray-100 transition-colors"
              style={{ padding: 0, margin: 0, minWidth: 0, minHeight: 0, maxWidth: '1.25rem', maxHeight: '1.25rem' }}
            >
              <Share className="h-3 w-3" />
            </Button>
          </>
        )}

        {/* Favorite button */}
        {onFavorite && (
          <>
            <div className="w-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onFavorite}
              className="h-5 w-5 p-0 m-0 min-w-0 min-h-0 max-w-5 max-h-5 hover:bg-gray-100 transition-colors group"
              style={{ padding: 0, margin: 0, minWidth: 0, minHeight: 0, maxWidth: '1.25rem', maxHeight: '1.25rem' }}
            >
              <Heart
                className={`h-3 w-3 transition-colors ${
                  isFavorited
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-600 group-hover:fill-red-500 group-hover:text-red-500'
                }`}
              />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
