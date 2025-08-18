"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"

const reviews = [
  {
    id: 1,
    reviewer: {
      name: "Sarah Cohen",
      avatar: "/placeholder.svg",
    },
    rating: 5,
    comment: "Great seller! Item was exactly as described and David was very responsive.",
    item: "2004 Toyota Sienna",
    date: "2 weeks ago",
  },
  {
    id: 2,
    reviewer: {
      name: "Michael Rodriguez",
      avatar: "/placeholder.svg",
    },
    rating: 4,
    comment: "Good transaction, item arrived on time. Would buy from again.",
    item: "Vintage Dining Table",
    date: "1 month ago",
  },
  {
    id: 3,
    reviewer: {
      name: "Rachel Green",
      avatar: "/placeholder.svg",
    },
    rating: 5,
    comment: "Excellent communication and fast delivery. Highly recommended!",
    item: "Kids Bicycle",
    date: "2 months ago",
  },
]

export default function ReviewsPage() {
  const router = useRouter()
  const { user } = useAuth()

  if (!user) {
    router.push("/login")
    return null
  }

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-semibold">Reviews</h1>
        <div></div>
      </header>

      <div className="p-4">
        <Card className="mb-6">
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
              <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
            </div>
            <p className="text-gray-600">{reviews.length} reviews</p>
            <div className="flex justify-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= averageRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Customer Reviews</h2>
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={review.reviewer.avatar || "/placeholder.svg"} alt={review.reviewer.name} />
                    <AvatarFallback>{review.reviewer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{review.reviewer.name}</h3>
                      <span className="text-sm text-gray-500">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">• {review.item}</span>
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
