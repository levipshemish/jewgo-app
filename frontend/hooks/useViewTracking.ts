import { useCallback, useEffect, useRef } from 'react'

interface UseViewTrackingOptions {
  restaurantId: string | number
  enabled?: boolean
  debounceMs?: number
}

interface UseViewTrackingReturn {
  trackView: () => void
  isTracking: boolean
}

/**
 * Hook to track restaurant page views
 * Implements debouncing to prevent duplicate tracking calls
 */
export function useViewTracking({
  restaurantId,
  enabled = true,
  debounceMs = 1000
}: UseViewTrackingOptions): UseViewTrackingReturn {
  const isTrackingRef = useRef(false)
  const lastTrackTimeRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const trackView = useCallback(async () => {
    if (!enabled || !restaurantId) return

    const now = Date.now()
    
    // Debounce: don't track if called too recently
    if (now - lastTrackTimeRef.current < debounceMs) {
      return
    }

    // Don't track if already tracking
    if (isTrackingRef.current) {
      return
    }

    isTrackingRef.current = true
    lastTrackTimeRef.current = now

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.warn('Failed to track view:', response.statusText)
      }
    } catch (error) {
      console.warn('Error tracking view:', error)
    } finally {
      isTrackingRef.current = false
    }
  }, [restaurantId, enabled, debounceMs])

  // Cleanup timeout on unmount
  useEffect(() => {
    const timeout = timeoutRef.current
    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [])

  return {
    trackView,
    isTracking: isTrackingRef.current
  }
}
