"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"

const mockMessages = [
  {
    id: 1,
    name: "Sarah Cohen",
    message: "Is the bike still available?",
    time: "2m ago",
    unread: true,
    avatar: "/placeholder.svg",
  },
  {
    id: 2,
    name: "David Goldberg",
    message: "Thanks for the quick delivery!",
    time: "1h ago",
    unread: false,
    avatar: "/placeholder.svg",
  },
  {
    id: 3,
    name: "Rachel Green",
    message: "Can we meet tomorrow at 3pm?",
    time: "3h ago",
    unread: true,
    avatar: "/placeholder.svg",
  },
]

export default function MessagesPage() {
  const router = useRouter()
  const { user } = useAuth()

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-semibold">Messages</h1>
        <div></div>
      </header>

      <div className="p-4">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input placeholder="Search messages..." className="pl-10 bg-white" />
          </div>
        </div>

        <div className="space-y-2">
          {mockMessages.map((message) => (
            <Card key={message.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={message.avatar || "/placeholder.svg"} alt={message.name} />
                    <AvatarFallback>{message.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium ${message.unread ? "text-gray-900" : "text-gray-600"}`}>
                        {message.name}
                      </h3>
                      <span className="text-sm text-gray-500">{message.time}</span>
                    </div>
                    <p className={`text-sm truncate ${message.unread ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                      {message.message}
                    </p>
                  </div>
                  {message.unread && <div className="w-2 h-2 bg-purple-600 rounded-full"></div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
