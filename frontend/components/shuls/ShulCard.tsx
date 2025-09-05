"use client"
import Card, { CardData } from "@/components/core/cards/Card"

// Type definitions for shul data
export interface Shul {
  id: string
  name: string
  denomination: "Orthodox" | "Conservative" | "Reform" | "Reconstructionist" | "Chabad" | "Sephardic" | "Modern Orthodox" | "Yeshivish"
  hechsher?: string[]
  neighborhood?: string
  city?: string
  state?: string
  services: string[]
  rating?: number
  review_count?: number
  distance?: number
  is_open_now?: boolean
  next_service?: string
  minyan_times?: {
    shacharit?: string
    mincha?: string
    maariv?: string
  }
  images?: Array<{
    url: string
    is_hero?: boolean
  }>
  features?: string[]
  contact?: {
    phone?: string
    email?: string
    website?: string
  }
}

interface ShulCardProps {
  shul: Shul
  showDistance?: boolean
  showRating?: boolean
  showServices?: boolean
  onClick?: () => void
}

export default function ShulCard({ 
  shul, 
  showDistance = true, 
  showRating = true, 
  showServices = true,
  onClick 
}: ShulCardProps) {
  // Transform shul data to match Card interface
  const cardData: CardData = {
    id: String(shul.id),
    imageUrl: shul.images?.[0]?.url || "/shul-placeholder.jpg",
    title: shul.name,
    badge: showRating && shul.rating ? shul.rating.toFixed(1) : undefined,
    subtitle: getSubtitle(),
    additionalText: getAdditionalText(),
    showHeart: true,
    isLiked: false,
    kosherCategory: shul.denomination,
    city: shul.city || shul.neighborhood || shul.state,
    imageTag: shul.denomination,
  }

  function getSubtitle(): string {
    const parts: string[] = []

    if (shul.neighborhood || shul.city) {
      const location = shul.neighborhood || shul.city
      parts.push(location!)
    }

    if (shul.state) {
      parts.push(shul.state)
    }

    return parts.length > 0 ? parts.join(", ") : ""
  }

  function getAdditionalText(): string {
    // Priority: Distance > Services > Rating (matching eatery page logic)
    if (showDistance && shul.distance !== undefined) {
      return `${shul.distance.toFixed(1)} mi away`
    }

    if (showServices && shul.services && shul.services.length > 0) {
      const serviceCount = shul.services.length
      return `${serviceCount} service${serviceCount > 1 ? 's' : ''}`
    }

    if (showRating && shul.rating && shul.review_count) {
      return `${shul.review_count} reviews`
    }

    return ""
  }

  const handleCardClick = (data: CardData) => {
    console.log("Shul card clicked:", data)
    // Navigate to ID-based shul detail page
    if (typeof window !== 'undefined') {
      window.location.href = `/shuls/${shul.id}`
    }
    onClick?.()
  }

  return (
    <div className="w-full" role="gridcell">
      <Card
        data={cardData}
        variant="default"
        showStarInBadge={true}
        onCardClick={handleCardClick}
        priority={false}
        className="w-full h-full"
      />
    </div>
  )
}