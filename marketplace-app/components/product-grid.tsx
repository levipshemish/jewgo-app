"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, MapPin, Clock, Eye } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useLocation } from "@/hooks/use-location"

interface Product {
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
  isFavorited?: boolean
  seller: {
    name: string
    rating: number
    avatar: string
  }
}

const products: Product[] = [
  {
    id: 1,
    title: "2004 Toyota Sienna - Great Family Car",
    price: "$2,400",
    originalPrice: "$3,100",
    image: "/silver-minivan-beach.png",
    isFree: false,
    location: "Miami Gardens, FL",
    timeAgo: "2 hours ago",
    category: "Vehicles",
    condition: "Good",
    views: 45,
    seller: {
      name: "David M.",
      rating: 4.8,
      avatar: "/placeholder.svg",
    },
  },
  {
    id: 2,
    title: "Box of Small LEGO Pieces - Perfect for Kids",
    price: "Free",
    image: "/placeholder-cm5o8.png",
    isFree: true,
    location: "Aventura, FL",
    timeAgo: "4 hours ago",
    category: "Toys",
    condition: "Like New",
    views: 23,
    seller: {
      name: "Sarah K.",
      rating: 4.9,
      avatar: "/placeholder.svg",
    },
  },
  {
    id: 3,
    title: "Kosher Fleishig Oven - Built-in Model",
    price: "Free",
    image: "/built-in-kitchen-oven.png",
    isFree: true,
    location: "North Miami Beach, FL",
    timeAgo: "6 hours ago",
    category: "Appliances",
    condition: "Fair",
    views: 67,
    seller: {
      name: "Rachel G.",
      rating: 4.7,
      avatar: "/placeholder.svg",
    },
  },
  {
    id: 4,
    title: "Modern Couches & Chairs Set",
    price: "$100",
    image: "/modern-living-room.png",
    isFree: false,
    location: "Hallandale Beach, FL",
    timeAgo: "8 hours ago",
    category: "Furniture",
    condition: "Good",
    views: 89,
    seller: {
      name: "Michael L.",
      rating: 4.6,
      avatar: "/placeholder.svg",
    },
  },
  {
    id: 5,
    title: "Mountain Bike - Trek Model",
    price: "$150",
    image: "/black-mountain-bike-forest.png",
    isFree: false,
    location: "Sunny Isles Beach, FL",
    timeAgo: "12 hours ago",
    category: "Sports",
    condition: "Excellent",
    views: 34,
    seller: {
      name: "Josh R.",
      rating: 4.9,
      avatar: "/placeholder.svg",
    },
  },
  {
    id: 6,
    title: "Storage Unit Organization System",
    price: "$50",
    image: "/organized-storage-shelves.png",
    isFree: false,
    location: "Miami Gardens, FL",
    timeAgo: "1 day ago",
    category: "Home & Garden",
    condition: "Like New",
    views: 56,
    seller: {
      name: "Lisa C.",
      rating: 4.8,
      avatar: "/placeholder.svg",
    },
  },
]

export function ProductGrid() {
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const { currentLocation, calculateDistance } = useLocation()

  const toggleFavorite = (productId: number) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId)
    } else {
      newFavorites.add(productId)
    }
    setFavorites(newFavorites)
  }

  const sortedProducts = currentLocation
    ? [...products].sort((a, b) => {
        const userLocation = `${currentLocation.city}, ${currentLocation.state}`
        const distanceA = calculateDistance(userLocation, a.location)
        const distanceB = calculateDistance(userLocation, b.location)
        return distanceA - distanceB
      })
    : products

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-purple-600">Today's Picks</h2>
        <Button variant="ghost" size="sm" className="text-purple-600">
          View All
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedProducts.map((product) => {
          const distance = currentLocation
            ? calculateDistance(`${currentLocation.city}, ${currentLocation.state}`, product.location)
            : null

          return (
            <Card key={product.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
              <Link href={`/listing/${product.id}`}>
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  <Badge variant="secondary" className="absolute top-2 left-2 bg-white/90 text-gray-700">
                    {product.condition}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2"
                    onClick={(e) => {
                      e.preventDefault()
                      toggleFavorite(product.id)
                    }}
                  >
                    <Heart
                      className={`w-4 h-4 ${favorites.has(product.id) ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                    />
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
                    {distance !== null && <span className="text-purple-600">• {distance} mi</span>}
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
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">{product.seller.name}</span>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
