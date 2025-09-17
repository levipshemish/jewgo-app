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
 * Implements session-based deduplication to prevent duplicate tracking calls
 * Only tracks 1 view per restaurant per session (30-minute window)
 */
export function useViewTracking({
  restaurantId,
  enabled = true,
  debounceMs = 1000
}: UseViewTrackingOptions): UseViewTrackingReturn {
  const isTrackingRef = useRef(false)
  const lastTrackTimeRef = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const viewedRestaurantsRef = useRef<Set<string>>(new Set())

  // Get or create session ID for deduplication
  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return 'server-session'
    
    const STORAGE_KEY = 'jewgo_view_tracking_session'
    const SESSION_DURATION = 30 * 60 * 1000 // 30 minutes
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const { sessionId, timestamp, viewedRestaurants } = JSON.parse(stored)
        
        // Check if session is still valid
        if (Date.now() - timestamp < SESSION_DURATION) {
          // Restore viewed restaurants for this session
          viewedRestaurantsRef.current = new Set(viewedRestaurants || [])
          return sessionId
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
    
    // Create new session
    const newSessionId = `view_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    viewedRestaurantsRef.current = new Set()
    
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionId: newSessionId,
        timestamp: Date.now(),
        viewedRestaurants: []
      }))
    } catch (e) {
      // Ignore storage errors
    }
    
    return newSessionId
  }, [])

  // Update session storage with viewed restaurants
  const updateSessionStorage = useCallback((sessionId: string, viewedRestaurants: Set<string>) => {
    if (typeof window === 'undefined') return
    
    try {
      const STORAGE_KEY = 'jewgo_view_tracking_session'
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessionId,
        timestamp: Date.now(),
        viewedRestaurants: Array.from(viewedRestaurants)
      }))
    } catch (e) {
      // Ignore storage errors
    }
  }, [])

  const trackView = useCallback(async () => {
    console.log(`🔍 [FRONTEND VIEW TRACKING] trackView called for restaurant_id: ${restaurantId}`)
    
    if (!enabled || !restaurantId) {
      console.log(`⏭️ [FRONTEND VIEW TRACKING] Skipping - enabled: ${enabled}, restaurantId: ${restaurantId}`)
      return
    }

    const restaurantKey = String(restaurantId)
    const sessionId = getSessionId()
    
    // Check if we've already tracked this restaurant in this session
    if (viewedRestaurantsRef.current.has(restaurantKey)) {
      console.log(`⏭️ [FRONTEND VIEW TRACKING] Skipping - restaurant ${restaurantId} already tracked in session ${sessionId}`)
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

    console.log(`🚀 [FRONTEND VIEW TRACKING] Starting view tracking for restaurant ${restaurantId} (session: ${sessionId})`)
    isTrackingRef.current = true
    lastTrackTimeRef.current = now

    try {
      // Create minimal payload to avoid REQUEST_TOO_LARGE errors
      const payload = {
        restaurant_id: Number(restaurantId),
        session_id: sessionId,
        timestamp: now,
        source: 'frontend_view_tracking'
      }
      
      const url = `/api/v5/restaurants/${restaurantId}/view`
      console.log(`📡 [FRONTEND VIEW TRACKING] Making POST request to: ${url}`)
      console.log(`📦 [FRONTEND VIEW TRACKING] Payload size: ${JSON.stringify(payload).length} bytes`)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      console.log(`📡 [FRONTEND VIEW TRACKING] Response status: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND VIEW TRACKING] Success! Response data:`, data)
        
        // Mark this restaurant as viewed in this session
        viewedRestaurantsRef.current.add(restaurantKey)
        updateSessionStorage(sessionId, viewedRestaurantsRef.current)
        
        if (data.success && data.data) {
          console.log(`📊 [FRONTEND VIEW TRACKING] View count updated: ${data.data.view_count_before} → ${data.data.view_count} (+${data.data.increment})`)
          console.log(`🏪 [FRONTEND VIEW TRACKING] Restaurant: ${data.data.restaurant_name} (ID: ${data.data.restaurant_id})`)
        }
      } else {
        let errorText = 'Unknown error'
        try {
          const responseText = await response.text()
          errorText = responseText
          
          // Handle REQUEST_TOO_LARGE specifically
          if (response.status === 413) {
            console.error(`❌ [FRONTEND VIEW TRACKING] Payload too large (${JSON.stringify(payload).length} bytes)`)
            console.error(`❌ [FRONTEND VIEW TRACKING] Payload:`, payload)
          }
        } catch (e) {
          // Ignore parsing errors
        }
        
        console.error(`❌ [FRONTEND VIEW TRACKING] Failed to track view: ${response.status} ${response.statusText}`)
        console.error(`❌ [FRONTEND VIEW TRACKING] Error response:`, errorText)
      }
    } catch (error) {
      console.error(`💥 [FRONTEND VIEW TRACKING] Error tracking view:`, error)
    } finally {
      isTrackingRef.current = false
      console.log(`🏁 [FRONTEND VIEW TRACKING] Tracking completed for restaurant ${restaurantId}`)
    }
  }, [restaurantId, enabled, debounceMs, getSessionId, updateSessionStorage])

  // Initialize session on mount
  useEffect(() => {
    getSessionId()
  }, [getSessionId])

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
