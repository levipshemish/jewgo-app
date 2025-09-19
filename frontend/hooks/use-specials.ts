/**
 * React hooks for the Specials System
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Special,
  SpecialsQueryParams,
  ClaimSpecialResponse,
  UseSpecialsReturn,
  UseSpecialClaimReturn,
  UseSpecialEventsReturn,
  EventType
} from '@/types/specials'
import { specialsApi } from '@/lib/api/specials'

/**
 * Hook to fetch and manage specials for a restaurant
 */
export function useSpecials(
  restaurantId: number,
  params: SpecialsQueryParams = {}
): UseSpecialsReturn {
  const [specials, setSpecials] = useState<Special[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchSpecials = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = {
        ...params,
        offset: reset ? 0 : specials.length,
        limit: params.limit || 20,
      }

      const response = await specialsApi.getRestaurantSpecials(restaurantId, queryParams)
      
      if (reset) {
        setSpecials(response.specials)
      } else {
        setSpecials(prev => [...prev, ...response.specials])
      }
      
      setTotal(response.total)
      setHasMore(response.has_more)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch specials')
    } finally {
      setLoading(false)
    }
  }, [restaurantId, params, specials.length])

  const refetch = useCallback(() => {
    return fetchSpecials(true)
  }, [fetchSpecials])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      return fetchSpecials(false)
    }
    return Promise.resolve()
  }, [fetchSpecials, loading, hasMore])

  useEffect(() => {
    fetchSpecials(true)
  }, [fetchSpecials])

  return {
    specials,
    loading,
    error,
    total,
    hasMore,
    refetch,
    loadMore,
  }
}

/**
 * Hook to manage claiming specials
 */
export function useSpecialClaim(): UseSpecialClaimReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const claim = useCallback(async (special: Special, guestSessionId?: string): Promise<ClaimSpecialResponse> => {
    try {
      setLoading(true)
      setError(null)

      const response = await specialsApi.claimSpecial(special.id, {
        guest_session_id: guestSessionId,
      })

      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim special'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    claim,
    loading,
    error,
  }
}

/**
 * Hook to track special events (views, shares, clicks)
 */
export function useSpecialEvents(): UseSpecialEventsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trackEvent = useCallback(async (
    specialId: string,
    eventType: EventType,
    guestSessionId?: string
  ): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      await specialsApi.trackSpecialEvent(specialId, {
        event_type: eventType,
        guest_session_id: guestSessionId,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track event'
      setError(errorMessage)
      // Don't throw error for analytics events - they shouldn't break the UI
      console.warn('Failed to track special event:', errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    trackEvent,
    loading,
    error,
  }
}

/**
 * Hook to manage special creation/editing (for restaurant owners/admins)
 */
export function useSpecialManagement(restaurantId: number) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSpecial = useCallback(async (data: any) => {
    try {
      setLoading(true)
      setError(null)

      const response = await specialsApi.createSpecial({
        ...data,
        restaurant_id: restaurantId,
      })

      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create special'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const updateSpecial = useCallback(async (specialId: string, data: any) => {
    try {
      setLoading(true)
      setError(null)

      const response = await specialsApi.updateSpecial(specialId, data)

      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update special'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSpecial = useCallback(async (specialId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await specialsApi.deleteSpecial(specialId)

      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete special'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createSpecial,
    updateSpecial,
    deleteSpecial,
    loading,
    error,
  }
}

/**
 * Hook to get lookup data (discount kinds, media kinds)
 */
export function useSpecialsLookupData() {
  const [discountKinds, setDiscountKinds] = useState<any[]>([])
  const [mediaKinds, setMediaKinds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLookupData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [discountResponse, mediaResponse] = await Promise.all([
        specialsApi.getDiscountKinds(),
        specialsApi.getMediaKinds(),
      ])

      setDiscountKinds(discountResponse.discount_kinds)
      setMediaKinds(mediaResponse.media_kinds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lookup data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLookupData()
  }, [fetchLookupData])

  return {
    discountKinds,
    mediaKinds,
    loading,
    error,
    refetch: fetchLookupData,
  }
}

/**
 * Hook to manage guest session for claiming specials
 */
export function useGuestSession() {
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null)

  useEffect(() => {
    // Check if guest session exists in localStorage
    const existingSessionId = localStorage.getItem('guest_session_id')
    if (existingSessionId) {
      setGuestSessionId(existingSessionId)
    } else {
      // Generate new guest session ID
      const newSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('guest_session_id', newSessionId)
      setGuestSessionId(newSessionId)
    }
  }, [])

  return guestSessionId
}

/**
 * Hook to track special views automatically
 */
export function useSpecialViewTracking(special: Special | null) {
  const { trackEvent } = useSpecialEvents()
  const guestSessionId = useGuestSession()

  useEffect(() => {
    if (special) {
      // Track view event with a small delay to avoid duplicate tracking
      const timer = setTimeout(() => {
        trackEvent(special.id, 'view', guestSessionId || undefined)
      }, 1000)

      return () => clearTimeout(timer)
    }
    // Return undefined for the case when special is null
    return undefined
  }, [special, trackEvent, guestSessionId])
}

/**
 * Hook to manage special claim modal state
 */
export function useSpecialClaimModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSpecial, setSelectedSpecial] = useState<Special | null>(null)

  const openModal = useCallback((special: Special) => {
    setSelectedSpecial(special)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setSelectedSpecial(null)
  }, [])

  return {
    isOpen,
    selectedSpecial,
    openModal,
    closeModal,
  }
}
