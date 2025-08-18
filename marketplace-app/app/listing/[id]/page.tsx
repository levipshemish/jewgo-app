"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Heart, Share2, MapPin, Clock, Eye, Star, MessageCircle, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"

// Mock data - in a real app this would come from an API
const mockListing = {
  id: 1,
  title: "2004 Toyota Sienna - Great Family Car",
  price: "$2,400",
  originalPrice: "$3,100",
  images: [
    "/silver-minivan-beach.png",
    "/placeholder.svg?height=300&width=400",
    "/placeholder.svg?height=300&width=400",
  ],
  description:
    "Well-maintained Toyota Sienna perfect for families. Recent oil change, new tires, and clean interior. Has been garage-kept and driven mainly for local trips. All maintenance records available.",
  location: "Miami Gardens, FL",
  timeAgo: "2 hours ago",
  category: "Vehicles",
  condition: "Good",
  views: 45,
  isFree: false,
  seller: {
    name: "David M.",
    rating: 4.8,
    reviewCount: 23,
    avatar: "/placeholder.svg",
    joinedDate: "Member since 2022",
    responseTime: "Usually responds within 1 hour",
  },
  specifications: [
    { label: "Year", value: "2004" },
    { label: "Make", value: "Toyota" },
    { label: "Model", value: "Sienna" },
    { label: "Mileage", value: "145,000 miles" },
    { label: "Color", value: "Silver" },
    { label: "Transmission", value: "Automatic" },
  ],
}

export default function ListingPage() {
  const params = useParams()
  const router = useRouter()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)

  const listing = mockListing // In real app, fetch by params.id

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsFavorited(!isFavorited)}>
            <Heart className={`w-4 h-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
          <Button variant="ghost" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        {/* Image Gallery */}
        <div className="bg-white">
          <div className="aspect-square bg-gray-100 relative">
            <img
              src={listing.images[currentImageIndex] || "/placeholder.svg"}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {listing.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {listing.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full ${index === currentImageIndex ? "bg-white" : "bg-white/50"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 space-y-4">
          {/* Price and Title */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">{listing.price}</span>
                  {listing.originalPrice && (
                    <span className="text-lg text-gray-400 line-through">{listing.originalPrice}</span>
                  )}
                  {!listing.isFree && <Badge className="bg-green-100 text-green-800">Great Deal</Badge>}
                </div>
                <h1 className="text-xl font-semibold text-gray-900">{listing.title}</h1>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{listing.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{listing.timeAgo}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{listing.views} views</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Badge variant="outline">{listing.category}</Badge>
                  <Badge variant="outline">{listing.condition}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700 leading-relaxed">{listing.description}</p>
            </CardContent>
          </Card>

          {/* Specifications */}
          {listing.specifications && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
                <div className="grid grid-cols-2 gap-3">
                  {listing.specifications.map((spec, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-600">{spec.label}</span>
                      <span className="font-medium text-gray-900">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seller Info */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold text-gray-900 mb-3">Seller Information</h2>
              <div className="flex items-center space-x-3 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={listing.seller.avatar || "/placeholder.svg"} alt={listing.seller.name} />
                  <AvatarFallback>{listing.seller.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{listing.seller.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{listing.seller.rating}</span>
                      <span>({listing.seller.reviewCount} reviews)</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{listing.seller.joinedDate}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{listing.seller.responseTime}</p>

              <div className="flex gap-3">
                <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Safety Tips */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-medium text-blue-900 mb-2">Safety Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Meet in a public place</li>
                <li>• Inspect the item before purchasing</li>
                <li>• Don't send money in advance</li>
                <li>• Trust your instincts</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 bg-transparent">
            Make Offer
          </Button>
          <Button className="flex-1 bg-purple-600 hover:bg-purple-700">Contact Seller</Button>
        </div>
      </div>

      {/* Add bottom padding to account for fixed action bar */}
      <div className="h-20"></div>
    </div>
  )
}
