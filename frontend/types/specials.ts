/**
 * TypeScript interfaces for the Specials System
 */

// Base interfaces for lookup data
export interface DiscountKind {
  code: string
  label: string
  description?: string
}

export interface ClaimStatus {
  code: string
  label: string
  description?: string
}

export interface MediaKind {
  code: string
  label: string
  description?: string
}

// Main special interface
export interface Special {
  id: string
  restaurant_id: number
  title: string
  subtitle?: string
  description?: string
  
  // Discount Configuration
  discount_type: string
  discount_value?: number
  discount_label: string
  
  // Time Windows
  valid_from: string
  valid_until: string
  
  // Limits & Rules
  max_claims_total?: number
  max_claims_per_user: number
  per_visit: boolean
  is_active: boolean
  
  // Terms & Conditions
  requires_code: boolean
  code_hint?: string
  terms?: string
  
  // Media
  hero_image_url?: string
  media_items: SpecialMedia[]
  
  // UI State
  can_claim: boolean
  user_claims_remaining: number
  
  // Timestamps
  created_at: string
  updated_at?: string
}

// Media attachment interface
export interface SpecialMedia {
  id: string
  special_id: string
  kind: string
  url: string
  alt_text?: string
  position: number
  created_at: string
}

// Claim interface
export interface SpecialClaim {
  id: string
  special_id: string
  user_id?: string
  guest_session_id?: string
  
  // Claim Details
  claimed_at: string
  ip_address?: string
  user_agent?: string
  
  // Status & Redemption
  status: string
  redeemed_at?: string
  redeemed_by?: string
  revoked_at?: string
  revoke_reason?: string
  
  // Generated fields
  claim_day: string
}

// Analytics event interface
export interface SpecialEvent {
  id: string
  special_id: string
  user_id?: string
  guest_session_id?: string
  event_type: 'view' | 'share' | 'click' | 'claim'
  occurred_at: string
  ip_address?: string
  user_agent?: string
}

// API Request/Response interfaces

// List specials response
export interface SpecialsListResponse {
  specials: Special[]
  total: number
  has_more: boolean
  window: 'now' | 'today' | 'range'
  from?: string
  until?: string
}

// Create special request
export interface CreateSpecialRequest {
  restaurant_id: number
  title: string
  subtitle?: string
  description?: string
  discount_type: string
  discount_value?: number
  discount_label: string
  valid_from: string
  valid_until: string
  max_claims_total?: number
  max_claims_per_user?: number
  per_visit?: boolean
  requires_code?: boolean
  code_hint?: string
  terms?: string
  hero_image_url?: string
  media_items?: Omit<SpecialMedia, 'id' | 'special_id' | 'created_at'>[]
}

// Update special request
export interface UpdateSpecialRequest {
  title?: string
  subtitle?: string
  description?: string
  discount_type?: string
  discount_value?: number
  discount_label?: string
  valid_from?: string
  valid_until?: string
  max_claims_total?: number
  max_claims_per_user?: number
  per_visit?: boolean
  requires_code?: boolean
  code_hint?: string
  terms?: string
  hero_image_url?: string
  is_active?: boolean
}

// Claim special request
export interface ClaimSpecialRequest {
  guest_session_id?: string
}

// Claim special response
export interface ClaimSpecialResponse {
  claim_id: string
  status: string
  claimed_at: string
  redeem_code?: string
  terms?: string
  message: string
}

// Redeem claim request
export interface RedeemClaimRequest {
  claim_id: string
  redeem_code?: string
}

// Redeem claim response
export interface RedeemClaimResponse {
  claim_id: string
  status: string
  redeemed_at: string
  redeemed_by: string
  message: string
}

// Track event request
export interface TrackEventRequest {
  event_type: 'view' | 'share' | 'click' | 'claim'
  guest_session_id?: string
}

// Track event response
export interface TrackEventResponse {
  event_id: string
  message: string
}

// Lookup data responses
export interface DiscountKindsResponse {
  discount_kinds: DiscountKind[]
}

export interface MediaKindsResponse {
  media_kinds: MediaKind[]
}

// Query parameters for listing specials
export interface SpecialsQueryParams {
  window?: 'now' | 'today' | 'range'
  from?: string
  until?: string
  limit?: number
  offset?: number
}

// Component props interfaces
export interface SpecialsDisplayProps {
  restaurantId: number
  window?: 'now' | 'today' | 'range'
  from?: string
  until?: string
  limit?: number
  showTitle?: boolean
  showDescription?: boolean
  showMedia?: boolean
  onSpecialClick?: (special: Special) => void
  onClaimClick?: (special: Special) => void
  onShareClick?: (special: Special) => void
}

export interface SpecialCardProps {
  special: Special
  onClaim?: (special: Special) => void
  onShare?: (special: Special) => void
  onViewDetails?: (special: Special) => void
  showClaimButton?: boolean
  showShareButton?: boolean
  compact?: boolean
}

export interface ClaimModalProps {
  special: Special | null
  isOpen: boolean
  onClose: () => void
  onClaim: (special: Special) => Promise<void>
  isLoading?: boolean
  error?: string
}

export interface SpecialsManagementProps {
  restaurantId: number
  onSpecialCreated?: (special: Special) => void
  onSpecialUpdated?: (special: Special) => void
  onSpecialDeleted?: (specialId: string) => void
}

// Utility types
export type SpecialWindow = 'now' | 'today' | 'range'
export type EventType = 'view' | 'share' | 'click' | 'claim'
export type ClaimStatusType = 'claimed' | 'redeemed' | 'expired' | 'cancelled' | 'revoked'

// Error types
export interface SpecialsError {
  error: string
  code?: string
  details?: Record<string, any>
}

// Hook return types
export interface UseSpecialsReturn {
  specials: Special[]
  loading: boolean
  error: string | null
  total: number
  hasMore: boolean
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
}

export interface UseSpecialClaimReturn {
  claim: (special: Special, guestSessionId?: string) => Promise<ClaimSpecialResponse>
  loading: boolean
  error: string | null
}

export interface UseSpecialEventsReturn {
  trackEvent: (specialId: string, eventType: EventType, guestSessionId?: string) => Promise<void>
  loading: boolean
  error: string | null
}
