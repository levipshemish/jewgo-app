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
    console.log(`🔍 [FRONTEND VIEW TRACKING] trackView called for restaurant_id: ${restaurantId}`)
    
    if (!enabled || !restaurantId) {
      console.log(`⏭️ [FRONTEND VIEW TRACKING] Skipping - enabled: ${enabled}, restaurantId: ${restaurantId}`)
      return
    }

    const now = Date.now()
    
    // Debounce: don't track if called too recently
    if (now - lastTrackTimeRef.current < debounceMs) {
      console.log(`⏭️ [FRONTEND VIEW TRACKING] Skipping due to debounce - last track: ${lastTrackTimeRef.current}, now: ${now}, debounceMs: ${debounceMs}`)
      return
    }

    // Don't track if already tracking
    if (isTrackingRef.current) {
      console.log(`⏭️ [FRONTEND VIEW TRACKING] Skipping - already tracking`)
      return
    }

    console.log(`🚀 [FRONTEND VIEW TRACKING] Starting view tracking for restaurant ${restaurantId}`)
    isTrackingRef.current = true
    lastTrackTimeRef.current = now

    try {
      const url = `/api/restaurants/${restaurantId}/view`
      console.log(`📡 [FRONTEND VIEW TRACKING] Making POST request to: ${url}`)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log(`📡 [FRONTEND VIEW TRACKING] Response status: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND VIEW TRACKING] Success! Response data:`, data)
        
        if (data.success && data.data) {
          console.log(`📊 [FRONTEND VIEW TRACKING] View count updated: ${data.data.view_count_before} → ${data.data.view_count} (+${data.data.increment})`)
          console.log(`🏪 [FRONTEND VIEW TRACKING] Restaurant: ${data.data.restaurant_name} (ID: ${data.data.restaurant_id})`)
        }
      } else {
        const errorText = await response.text()
        console.error(`❌ [FRONTEND VIEW TRACKING] Failed to track view: ${response.status} ${response.statusText}`)
        console.error(`❌ [FRONTEND VIEW TRACKING] Error response:`, errorText)
      }
    } catch (error) {
      console.error(`💥 [FRONTEND VIEW TRACKING] Error tracking view:`, error)
    } finally {
      isTrackingRef.current = false
      console.log(`🏁 [FRONTEND VIEW TRACKING] Tracking completed for restaurant ${restaurantId}`)
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
