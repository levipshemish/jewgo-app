/**
 * API client functions for the Specials System
 */

import {
  Special,
  SpecialsListResponse,
  CreateSpecialRequest,
  UpdateSpecialRequest,
  ClaimSpecialRequest,
  ClaimSpecialResponse,
  RedeemClaimRequest,
  RedeemClaimResponse,
  TrackEventRequest,
  TrackEventResponse,
  DiscountKindsResponse,
  MediaKindsResponse,
  SpecialsQueryParams,
  SpecialsError
} from '@/types/specials'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://API.jewgo.app'

// Helper function to build query string
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  
  return searchParams.toString()
}

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: SpecialsError
    try {
      errorData = await response.json()
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
    }
    throw new Error(errorData.error || 'API request failed')
  }
  
  return response.json()
}

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  // Add auth token if available (implement based on your auth system)
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  return headers
}

/**
 * Get all specials (for the specials page)
 */
export async function getSpecials(params: SpecialsQueryParams = {}): Promise<SpecialsListResponse> {
  const queryString = buildQueryString(params)
  const url = `${API_BASE_URL}/api/v5/specials${queryString ? `?${queryString}` : ''}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return handleApiResponse<SpecialsListResponse>(response)
}

/**
 * Get specials for a restaurant
 */
export async function getRestaurantSpecials(
  restaurantId: number,
  params: SpecialsQueryParams = {}
): Promise<SpecialsListResponse> {
  const queryString = buildQueryString(params)
  const url = `${API_BASE_URL}/api/v5/specials${queryString ? `?${queryString}&restaurant_id=${restaurantId}` : `?restaurant_id=${restaurantId}`}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return handleApiResponse<SpecialsListResponse>(response)
}

/**
 * Create a new special
 */
export async function createSpecial(data: CreateSpecialRequest): Promise<{ id: string; message: string }> {
  const url = `${API_BASE_URL}/api/v5/specials`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  
  return handleApiResponse(response)
}

/**
 * Update a special
 */
export async function updateSpecial(
  specialId: string,
  data: UpdateSpecialRequest
): Promise<{ id: string; message: string }> {
  const url = `${API_BASE_URL}/api/v5/specials/${specialId}`
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  
  return handleApiResponse(response)
}

/**
 * Delete a special (soft delete by setting is_active = false)
 */
export async function deleteSpecial(specialId: string): Promise<{ id: string; message: string }> {
  return updateSpecial(specialId, { is_active: false })
}

/**
 * Claim a special
 */
export async function claimSpecial(
  specialId: string,
  data: ClaimSpecialRequest = {}
): Promise<ClaimSpecialResponse> {
  const url = `${API_BASE_URL}/api/v5/specials/${specialId}/claim`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  
  return handleApiResponse<ClaimSpecialResponse>(response)
}

/**
 * Redeem a claim (staff only)
 */
export async function redeemClaim(
  specialId: string,
  data: RedeemClaimRequest
): Promise<RedeemClaimResponse> {
  const url = `${API_BASE_URL}/api/v5/specials/${specialId}/redeem`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  
  return handleApiResponse<RedeemClaimResponse>(response)
}

/**
 * Track analytics events for specials
 */
export async function trackSpecialEvent(
  specialId: string,
  data: TrackEventRequest
): Promise<TrackEventResponse> {
  const url = `${API_BASE_URL}/api/v5/specials/${specialId}/events`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  
  return handleApiResponse<TrackEventResponse>(response)
}

/**
 * Get available discount kinds
 */
export async function getDiscountKinds(): Promise<DiscountKindsResponse> {
  const url = `${API_BASE_URL}/api/v5/specials/discount-kinds`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return handleApiResponse<DiscountKindsResponse>(response)
}

/**
 * Get available media kinds
 */
export async function getMediaKinds(): Promise<MediaKindsResponse> {
  const url = `${API_BASE_URL}/api/v5/specials/media-kinds`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return handleApiResponse<MediaKindsResponse>(response)
}

/**
 * Get a single special by ID
 */
export async function getSpecial(specialId: string): Promise<Special> {
  // For now, we'll get it through the restaurant specials endpoint
  // In the future, you might want to add a dedicated endpoint
  const url = `${API_BASE_URL}/api/v5/specials/${specialId}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return handleApiResponse<Special>(response)
}

/**
 * Get specials for multiple restaurants
 */
export async function getMultipleRestaurantSpecials(
  restaurantIds: number[],
  params: SpecialsQueryParams = {}
): Promise<Record<number, Special[]>> {
  const promises = restaurantIds.map(async (restaurantId) => {
    try {
      const response = await getRestaurantSpecials(restaurantId, params)
      return { restaurantId, specials: response.specials }
    } catch (error) {
      console.error(`Failed to fetch specials for restaurant ${restaurantId}:`, error)
      return { restaurantId, specials: [] }
    }
  })
  
  const results = await Promise.all(promises)
  
  return results.reduce((acc, { restaurantId, specials }) => {
    acc[restaurantId] = specials
    return acc
  }, {} as Record<number, Special[]>)
}

/**
 * Batch track events for multiple specials
 */
export async function batchTrackEvents(
  events: Array<{ specialId: string; eventType: 'view' | 'share' | 'click'; guestSessionId?: string }>
): Promise<TrackEventResponse[]> {
  const promises = events.map(({ specialId, eventType, guestSessionId }) =>
    trackSpecialEvent(specialId, { event_type: eventType, guest_session_id: guestSessionId })
  )
  
  return Promise.all(promises)
}

/**
 * Utility function to check if a special is currently active
 */
export function isSpecialActive(special: Special): boolean {
  const now = new Date()
  const validFrom = new Date(special.valid_from)
  const validUntil = new Date(special.valid_until)
  
  return special.is_active && now >= validFrom && now <= validUntil
}

/**
 * Utility function to get time remaining for a special
 */
export function getTimeRemaining(special: Special): {
  hours: number
  minutes: number
  seconds: number
  total: number
  isExpired: boolean
} {
  const now = new Date()
  const validUntil = new Date(special.valid_until)
  const total = Math.max(0, validUntil.getTime() - now.getTime())
  
  const hours = Math.floor(total / (1000 * 60 * 60))
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((total % (1000 * 60)) / 1000)
  
  return {
    hours,
    minutes,
    seconds,
    total,
    isExpired: total <= 0
  }
}

/**
 * Utility function to format discount label
 */
export function formatDiscountLabel(special: Special): string {
  if (special.discount_type === 'percentage' && special.discount_value) {
    return `${special.discount_value}% off`
  } else if (special.discount_type === 'fixed_amount' && special.discount_value) {
    return `$${special.discount_value} off`
  } else if (special.discount_type === 'bogo') {
    return 'Buy One Get One'
  } else if (special.discount_type === 'free_item') {
    return 'Free Item'
  }
  
  return special.discount_label
}

/**
 * Utility function to get special status
 */
export function getSpecialStatus(special: Special): 'upcoming' | 'active' | 'expired' | 'inactive' {
  if (!special.is_active) {
    return 'inactive'
  }
  
  const now = new Date()
  const validFrom = new Date(special.valid_from)
  const validUntil = new Date(special.valid_until)
  
  if (now < validFrom) {
    return 'upcoming'
  } else if (now > validUntil) {
    return 'expired'
  } else {
    return 'active'
  }
}

// Export all API functions
export const specialsApi = {
  getRestaurantSpecials,
  createSpecial,
  updateSpecial,
  deleteSpecial,
  claimSpecial,
  redeemClaim,
  trackSpecialEvent,
  getDiscountKinds,
  getMediaKinds,
  getSpecial,
  getMultipleRestaurantSpecials,
  batchTrackEvents,
  isSpecialActive,
  getTimeRemaining,
  formatDiscountLabel,
  getSpecialStatus,
}