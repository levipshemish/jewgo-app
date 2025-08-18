"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Edit, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

const userListings = [
  {
    id: 1,
    title: "2004 Toyota Sienna - Great Family Car",
    price: "$2,400",
    image: "/silver-minivan-beach.png",
    status: "active",
    views: 45,
    messages: 3,
    createdAt: "2 days ago",
  },
  {
    id: 7,
    title: "Vintage Dining Table Set",
    price: "$300",
    image: "/placeholder.svg?height=200&width=200",
    status: "sold",
    views: 89,
    messages: 12,
    createdAt: "1 week ago",
  },
  {
    id: 8,
    title: "Kids Bicycle - Red",
    price: "$75",
    image: "/placeholder.svg?height=200&width=200",
    status: "pending",
    views: 23,
    messages: 1,
    createdAt: "3 days ago",
  },
]

export default function MyListingsPage() {
  const router = useRouter()
  const { user } = useAuth()

  if (!user) {
    router.push("/login")
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "sold":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-semibold">My Listings</h1>
        <Button size="sm" onClick={() => router.push("/sell")} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          New
        </Button>
      </header>

      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Listings</h2>
          <p className="text-sm text-gray-600">{userListings.length} total listings</p>
        </div>

        <div className="space-y-4">
          {userListings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={listing.image || "/placeholder.svg"}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 truncate">{listing.title}</h3>
                      <Badge className={getStatusColor(listing.status)}>{listing.status}</Badge>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">{listing.price}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{listing.views} views</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{listing.messages} messages</span>
                      </div>
                      <span>{listing.createdAt}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="bg-transparent">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="bg-transparent">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
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
