"use client"

import { useState, useEffect, useCallback } from "react"
import type { BackendListingData, ListingApiResponse } from "@/types/listing"
import type { ListingData } from "@/types/listing"

interface UseListingApiOptions {
  listingId?: string
  autoFetch?: boolean
  fallbackData?: Partial<BackendListingData>
}

export function useListingApi(options: UseListingApiOptions = {}) {
  const { listingId, autoFetch = true, fallbackData = {} } = options

  const [data, setData] = useState<BackendListingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convert backend data to frontend format
  const transformToListingData = useCallback((backendData: BackendListingData): ListingData => {
    const mappedData: ListingData = {
      title: backendData.title,
      image: backendData.imageUrl ? {
        src: backendData.imageUrl,
        alt: backendData.imageAlt || '',
        actionLabel: backendData.imageActionLabel,
      } : undefined,
      content: backendData.leftText || backendData.rightText ? {
        leftText: backendData.leftText,
        rightText: backendData.rightText,
        leftAction: backendData.leftActionLabel,
        rightAction: backendData.rightActionLabel,
      } : undefined,
      actions: {
        primaryAction: backendData.primaryActionLabel ? {
          label: backendData.primaryActionLabel,
        } : undefined,
        secondaryActions: backendData.secondaryActionLabels?.map(label => ({
          label,
        })),
        tags: backendData.tags,
      },
      // header: backendData.header,
      address: backendData.address,
      description: backendData.description,
    };
    return mappedData;
  }, [])

  // Fetch listing data from API
  const fetchListing = useCallback(
    async (id?: string) => {
      if (!id && !listingId) return

      setLoading(true)
      setError(null)

      try {
        // Replace with your actual API endpoint
        const response = await fetch(`/api/listings/${id || listingId}`)
        const result: ListingApiResponse = await response.json()

        if (result.success && result.data) {
          setData(result.data)
        } else {
          setError(result.error || "Failed to fetch listing")
          // Use fallback data if available
          if (Object.keys(fallbackData).length > 0) {
            setData(fallbackData as BackendListingData)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error")
        // Use fallback data on error
        if (Object.keys(fallbackData).length > 0) {
          setData(fallbackData as BackendListingData)
        }
      } finally {
        setLoading(false)
      }
    },
    [listingId, fallbackData],
  )

  // Update listing data
  const updateListing = useCallback(
    async (updates: Partial<BackendListingData>) => {
      if (!listingId) return

      setLoading(true)
      try {
        const response = await fetch(`/api/listings/${listingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })

        const result: ListingApiResponse = await response.json()

        if (result.success && result.data) {
          setData(result.data)
        } else {
          setError(result.error || "Failed to update listing")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error")
      } finally {
        setLoading(false)
      }
    },
    [listingId],
  )

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && listingId) {
      fetchListing()
    }
  }, [autoFetch, listingId, fetchListing])

  return {
    data,
    loading,
    error,
    fetchListing,
    updateListing,
    transformToListingData,
    // Convenience getter for transformed data
    listingData: data ? transformToListingData(data) : null,
  }
}
