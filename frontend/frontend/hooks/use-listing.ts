"use client"

import { useState, useCallback } from "react"
import type { ListingData } from "@/components/listing/listing-page"

export function useListing(initialData: ListingData) {
  const [listingData, setListingData] = useState<ListingData>(initialData)
  const [isFavorited, setIsFavorited] = useState(initialData.header?.isFavorited || false)

  const updateListing = useCallback((updates: Partial<ListingData>) => {
    setListingData((prev) => ({
      ...prev,
      ...updates,
      header: {
        ...prev.header,
        ...updates.header,
      },
      image: {
        ...prev.image,
        ...updates.image,
      },
      content: {
        ...prev.content,
        ...updates.content,
      },
      actions: {
        ...prev.actions,
        ...updates.actions,
      },
    }))
  }, [])

  const toggleFavorite = useCallback(() => {
    setIsFavorited((prev) => {
      const newValue = !prev
      updateListing({
        header: {
          ...listingData.header,
          isFavorited: newValue,
        },
      })
      return newValue
    })
  }, [listingData.header, updateListing])

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: listingData.title,
        text: `Check out this listing: ${listingData.title}`,
        url: window.location.href,
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }, [listingData.title])

  return {
    listingData: {
      ...listingData,
      header: {
        ...listingData.header,
        isFavorited,
        onFavorite: toggleFavorite,
        onShare: handleShare,
      },
    },
    updateListing,
    toggleFavorite,
    handleShare,
    isFavorited,
  }
}
