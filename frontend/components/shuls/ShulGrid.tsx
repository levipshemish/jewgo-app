"use client"
import { useRef, RefObject } from "react"
import Grid from "@/components/core/grids/Grid"
import { AppliedFilters } from "@/lib/filters/filters.types"

interface ShulGridProps {
  category?: string
  searchQuery?: string
  showDistance?: boolean
  showRating?: boolean
  showServices?: boolean
  scrollContainerRef: RefObject<HTMLDivElement>
  userLocation?: { latitude: number; longitude: number } | null
  useRealData?: boolean
  activeFilters?: AppliedFilters
}

export default function ShulGrid({ 
  category = "all", 
  searchQuery = "",
  showDistance = true, 
  showRating = true, 
  showServices = true,
  scrollContainerRef,
  userLocation,
  useRealData = false,
  activeFilters = {}
}: ShulGridProps) {
  return (
    <Grid
      category={category}
      searchQuery={searchQuery}
      showDistance={showDistance}
      showRating={showRating}
      showServices={showServices}
      scrollContainerRef={scrollContainerRef}
      userLocation={userLocation}
      useRealData={useRealData}
      activeFilters={activeFilters}
      dataType="shuls"
    />
  )
}