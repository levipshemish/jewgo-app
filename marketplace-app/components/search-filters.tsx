"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { X } from "lucide-react"

interface SearchFiltersProps {
  filters: {
    category: string
    priceRange: [number, number]
    condition: string
    location: string
    sortBy: string
    distance: number
  }
  onFiltersChange: (filters: any) => void
  onClose: () => void
  onClear: () => void
}

const categories = [
  "Vehicles",
  "Electronics",
  "Furniture",
  "Clothing",
  "Books",
  "Toys",
  "Sports",
  "Appliances",
  "Home & Garden",
  "Other",
]

const conditions = ["New", "Like New", "Excellent", "Good", "Fair", "Poor"]

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "distance", label: "Distance" },
]

export function SearchFilters({ filters, onFiltersChange, onClose, onClear }: SearchFiltersProps) {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={filters.category} onValueChange={(value) => updateFilter("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition Filter */}
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={filters.condition} onValueChange={(value) => updateFilter("condition", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Any condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any condition</SelectItem>
                  {conditions.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {condition}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Enter city or zip"
                value={filters.location}
                onChange={(e) => updateFilter("location", e.target.value)}
              />
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label>Sort by</Label>
              <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-3">
            <Label>Price Range</Label>
            <div className="px-2">
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilter("priceRange", value as [number, number])}
                max={10000}
                min={0}
                step={50}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>${filters.priceRange[0]}</span>
              <span>${filters.priceRange[1] === 10000 ? "10,000+" : filters.priceRange[1]}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Distance</Label>
            <div className="px-2">
              <Slider
                value={[filters.distance]}
                onValueChange={(value) => updateFilter("distance", value[0])}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>1 mile</span>
              <span>{filters.distance === 50 ? "50+ miles" : `${filters.distance} miles`}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClear} className="flex-1 bg-transparent">
              Clear All
            </Button>
            <Button onClick={onClose} className="flex-1 bg-purple-600 hover:bg-purple-700">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
