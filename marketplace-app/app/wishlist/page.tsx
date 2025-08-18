"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"

// Mock wishlist data
const wishlistProducts = [
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
    seller: { name: "Sarah K.", rating: 4.9, avatar: "/placeholder.svg" },
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
    seller: { name: "Josh R.", rating: 4.9, avatar: "/placeholder.svg" },
  },
]

export default function WishlistPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Set<number>>(new Set([2, 5]))

  if (!user) {
    router.push("/login")
    return null
  }

  const toggleFavorite = (productId: number) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId)
    } else {
      newFavorites.add(productId)
    }
    setFavorites(newFavorites)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-semibold">My Wishlist</h1>
        <div></div>
      </header>

      <div className="p-4">
        {wishlistProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Heart className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-600 mb-4">Save items you're interested in to view them later</p>
            <Button onClick={() => router.push("/")} className="bg-purple-600 hover:bg-purple-700">
              Browse Items
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Saved Items</h2>
              <p className="text-sm text-gray-600">{wishlistProducts.length} items</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {wishlistProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onFavoriteToggle={toggleFavorite}
                  isFavorited={favorites.has(product.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
