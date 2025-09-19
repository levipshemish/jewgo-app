/**
 * Specials Components Export
 */

export { default as SpecialsDisplay, SpecialsDisplayCompact, UpcomingSpecials, SpecialsInRange } from './SpecialsDisplay'
export { default as SpecialCard, SpecialCardCompact, FeaturedSpecialCard } from './SpecialCard'
export { default as ClaimModal } from './ClaimModal'
export { default as SpecialsIntegration, SpecialsIntegrationCompact, RestaurantSpecialsSection, RestaurantCardWithSpecials } from './SpecialsIntegration'

// Re-export types for convenience
export type {
  SpecialsDisplayProps,
  SpecialCardProps,
  ClaimModalProps,
  Special,
  SpecialMedia,
  SpecialClaim,
  SpecialEvent,
  DiscountKind,
  ClaimStatus,
  MediaKind,
  SpecialsListResponse,
  CreateSpecialRequest,
  UpdateSpecialRequest,
  ClaimSpecialRequest,
  ClaimSpecialResponse,
  RedeemClaimRequest,
  RedeemClaimResponse,
  TrackEventRequest,
  TrackEventResponse,
  SpecialsQueryParams,
} from '@/types/specials'