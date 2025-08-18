"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, MapPin, Clock, Eye, Star } from "lucide-react"
import Link from "next/link"

interface ProductCardProps {
  product: {
    id: number
    title: string
    price: string
    originalPrice?: string
    image: string
    isFree: boolean
    location: string
    timeAgo: string
    category: string
    condition: string
    views: number
    seller: {
      name: string
      rating: number
      avatar: string
    }
  }
  onFavoriteToggle?: (productId: number) => void
  isFavorited?: boolean
}

export function ProductCard({ product, onFavoriteToggle, isFavorited = false }: ProductCardProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onFavoriteToggle?.(product.id)
  }

  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/listing/${product.id}`}>
        <div className="aspect-square bg-gray-100 relative">
          <img src={product.image || "/placeholder.svg"} alt={product.title} className="w-full h-full object-cover" />
          <Badge variant="secondary" className="absolute top-2 left-2 bg-white/90 text-gray-700">
            {product.condition}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2"
            onClick={handleFavoriteClick}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
          </Button>
          {product.isFree && <Badge className="absolute bottom-2 left-2 bg-green-600 text-white">FREE</Badge>}
        </div>
      </Link>
      <div className="p-3 space-y-2">
        <Link href={`/listing/${product.id}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">{product.price}</span>
                {product.originalPrice && (
                  <span className="text-sm text-gray-400 line-through">{product.originalPrice}</span>
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">{product.title}</h3>
            </div>
          </div>
        </Link>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{product.location}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{product.timeAgo}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{product.views}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {product.category}
          </Badge>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600">{product.seller.rating}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
