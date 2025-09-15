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
      <div className="inline-flex items-center px-4 py-2 rounded-full mt-6 shadow-lg max-w-fit backdrop-blur-md bg-white/80 border border-white/20 dark:bg-white/14 dark:border-white/22 whitespace-nowrap" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}>
        {/* Back button */}
        {onBack && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="h-8 w-8 p-0 m-0 min-w-0 min-h-0 max-w-8 max-h-8 hover:bg-gray-100 transition-colors"
            style={{ padding: 0, margin: 0, minWidth: 0, minHeight: 0, maxWidth: '2rem', maxHeight: '2rem' }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Kosher type */}
        {kosherType && (
          <>
            <div className="w-2 flex-shrink-0" />
            <span className={`text-sm font-medium m-0 whitespace-nowrap flex-shrink-0 ${
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
            <div className="w-2 flex-shrink-0" />
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
                  className="text-sm text-gray-600 hover:text-blue-600 underline transition-colors rounded p-1 m-0 whitespace-nowrap flex-shrink-0"
                >
                  {kosherAgency}
                </button>
              ) : (
                <span className="text-sm text-gray-600 m-0 whitespace-nowrap flex-shrink-0">
                  {kosherAgency}
                </span>
              )
            })()}
          </>
        )}

        {/* View count */}
        {viewCount !== undefined && viewCount >= 0 && (
          <>
            <div className="w-2 flex-shrink-0" />
            <div className="flex items-center gap-1.5 text-gray-600 m-0 whitespace-nowrap flex-shrink-0">
              <Eye className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm font-medium">{viewCount >= 1000 ? `${(viewCount / 1000).toFixed(1)}k` : viewCount}</span>
            </div>
          </>
        )}

        {/* Share button */}
        {shareCount !== undefined && (
          <>
            <div className="w-2 flex-shrink-0" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8 p-0 m-0 min-w-0 min-h-0 max-w-8 max-h-8 hover:bg-gray-100 transition-colors flex-shrink-0"
              style={{ padding: 0, margin: 0, minWidth: 0, minHeight: 0, maxWidth: '2rem', maxHeight: '2rem' }}
            >
              <Share className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Favorite button */}
        {onFavorite && (
          <>
            <div className="w-2 flex-shrink-0" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onFavorite}
              className="h-8 w-8 p-0 m-0 min-w-0 min-h-0 max-w-8 max-h-8 hover:bg-gray-100 transition-colors group flex-shrink-0"
              style={{ padding: 0, margin: 0, minWidth: 0, minHeight: 0, maxWidth: '2rem', maxHeight: '2rem' }}
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
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
