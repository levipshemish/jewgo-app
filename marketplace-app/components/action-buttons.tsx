"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown, MessageCircle, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function ActionButtons() {
  const router = useRouter()
  const { user } = useAuth()

  const handleSellClick = () => {
    if (!user) {
      router.push("/login")
    } else {
      router.push("/sell")
    }
  }

  const handleMessagesClick = () => {
    if (!user) {
      router.push("/login")
    } else {
      router.push("/messages")
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleSellClick} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6">
        <Zap className="w-4 h-4 mr-2" />
        Sell
      </Button>
      <Button variant="outline" className="rounded-full px-4 bg-transparent">
        Category
        <ChevronDown className="w-4 h-4 ml-2" />
      </Button>
      <Button onClick={handleMessagesClick} variant="outline" className="rounded-full px-4 ml-auto bg-transparent">
        <MessageCircle className="w-4 h-4 mr-2" />
        My messages
      </Button>
    </div>
  )
}
