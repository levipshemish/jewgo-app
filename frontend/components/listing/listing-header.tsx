"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, Share } from "lucide-react"
import styles from "./listing.module.css"

interface ListingHeaderProps {
  kosherType?: string
  kosherAgency?: string
  shareCount?: number
  onBack?: () => void
  onFavorite?: () => void
  isFavorited?: boolean
}

export function ListingHeader({
  kosherType,
  kosherAgency,
  shareCount,
  onBack,
  onFavorite,
  isFavorited = false
}: ListingHeaderProps) {
  return (
    <div className={styles.listingHeader}>
      <div className={styles.listingHeaderBar}>
        {/* Back button */}
        <button
          onClick={onBack}
          className={styles.listingHeaderButton}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Kosher info */}
        <div className="flex gap-2">
          {kosherType && (
            <span className={styles.listingHeaderTag}>
              {kosherType}
            </span>
          )}
          {kosherAgency && (
            <span className={styles.listingHeaderTag}>
              {kosherAgency}
            </span>
          )}
        </div>

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
                }).catch(console.error);
              }
            }}
            className={styles.listingHeaderStats}
          >
            <Share className="h-3 w-3" />
            <span>{shareCount.toLocaleString()}</span>
          </Button>
        )}

        {/* Heart button */}
        <button
          onClick={onFavorite}
          className={`${styles.listingHeaderButton} ${isFavorited ? 'text-red-500' : ''}`}
        >
          <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500' : ''}`} />
        </button>
      </div>
    </div>
  )
}
