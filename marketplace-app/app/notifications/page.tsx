"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, MessageCircle, Heart, Package, DollarSign, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

const notifications = [
  {
    id: 1,
    type: "message",
    title: "New message from Sarah Cohen",
    description: "Is the bike still available?",
    time: "5 minutes ago",
    unread: true,
    icon: MessageCircle,
  },
  {
    id: 2,
    type: "favorite",
    title: "Someone liked your listing",
    description: "Toyota Sienna - Great Family Car",
    time: "1 hour ago",
    unread: true,
    icon: Heart,
  },
  {
    id: 3,
    type: "offer",
    title: "New offer received",
    description: "$200 offer for Mountain Bike",
    time: "2 hours ago",
    unread: false,
    icon: DollarSign,
  },
  {
    id: 4,
    type: "listing",
    title: "Your listing is live",
    description: "Vintage Dining Table Set is now active",
    time: "1 day ago",
    unread: false,
    icon: Package,
  },
]

export default function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuth()

  if (!user) {
    router.push("/login")
    return null
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "message":
        return "text-blue-600 bg-blue-100"
      case "favorite":
        return "text-red-600 bg-red-100"
      case "offer":
        return "text-green-600 bg-green-100"
      case "listing":
        return "text-purple-600 bg-purple-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-semibold">Notifications</h1>
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </header>

      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          <Button variant="ghost" size="sm" className="text-purple-600">
            Mark all as read
          </Button>
        </div>

        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = notification.icon
            return (
              <Card
                key={notification.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${notification.unread ? "border-purple-200" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className={`font-medium ${notification.unread ? "text-gray-900" : "text-gray-600"}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{notification.time}</span>
                          {notification.unread && <div className="w-2 h-2 bg-purple-600 rounded-full"></div>}
                        </div>
                      </div>
                      <p className={`text-sm ${notification.unread ? "text-gray-700" : "text-gray-500"}`}>
                        {notification.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Package className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-600">We'll notify you when something happens</p>
          </div>
        )}
      </div>
    </div>
  )
}
