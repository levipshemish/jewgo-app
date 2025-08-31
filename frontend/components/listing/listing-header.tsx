"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, Share2 } from "lucide-react"

interface ListingHeaderProps {
  kosherType?: string
  kosherAgency?: string
  kosherAgencyWebsite?: string
  shareCount?: number
  onBack?: () => void
  onFavorite?: () => void
  isFavorited?: boolean
}

export function ListingHeader({
  kosherType,
  kosherAgency,
  kosherAgencyWebsite,
  shareCount = 0,
  onBack,
  onFavorite,
  isFavorited = false,
}: ListingHeaderProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4">
      <div className="flex items-center justify-between">
        {/* Left side - Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0 bg-black/20 hover:bg-black/30 text-white rounded-full backdrop-blur-sm"
        >
          <ArrowLeft size={16} />
        </Button>

        {/* Center - Kosher info */}
        <div className="flex gap-2">
          {kosherType && (
            <span className="px-2 py-1 bg-black/20 text-white text-xs font-medium rounded-full backdrop-blur-sm">
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
              
              return (
                <span 
                  className={`px-2 py-1 bg-black/20 text-white text-xs font-medium rounded-full backdrop-blur-sm ${
                    isClickable ? 'cursor-pointer hover:bg-black/30 transition-colors' : ''
                  }`}
                  onClick={() => {
                    if (!isClickable) return
                    
                    // First check if there's a specific website provided
                    if (kosherAgencyWebsite) {
                      window.open(kosherAgencyWebsite, '_blank')
                      return
                    }
                    
                    // If no specific website, check for known agencies
                    const lowerAgency = kosherAgency.toLowerCase()
                    
                    // Check for ORB (Orthodox Rabbinical Board) variations
                    if (lowerAgency.includes('orb') || 
                        lowerAgency.includes('orthodox rabbinical board')) {
                      window.open('https://www.orbkosher.com/', '_blank')
                      return
                    }
                    
                    // Check for Kosher Miami variations
                    if (lowerAgency.includes('kosher miami') || 
                        lowerAgency.includes('vaad hakashrus') ||
                        lowerAgency.includes('vaad') ||
                        lowerAgency.includes('miami-dade')) {
                      window.open('https://koshermiami.org/', '_blank')
                      return
                    }
                  }}
                >
                  {kosherAgency}
                </span>
              )
            })()
          )}
        </div>

        {/* Right side - Share count and favorite */}
        <div className="flex items-center gap-2">
          {shareCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Check out this restaurant!',
                    url: window.location.href
                  }).catch(console.error)
                } else {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('Link copied to clipboard!')
                  }).catch(() => {
                    prompt('Copy this link:', window.location.href)
                  })
                }
              }}
              className="h-8 px-2 bg-black/20 hover:bg-black/30 text-white text-xs font-medium rounded-full backdrop-blur-sm"
            >
              <Share2 size={12} className="mr-1" />
              {shareCount.toLocaleString()}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onFavorite}
            className="h-8 w-8 p-0 bg-black/20 hover:bg-black/30 text-white rounded-full backdrop-blur-sm"
          >
            <Heart 
              size={16} 
              className={isFavorited ? 'fill-red-500 text-red-500' : ''} 
            />
          </Button>
        </div>
      </div>
    </div>
  )
}
