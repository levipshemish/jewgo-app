"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Settings, Heart, Package, MessageCircle, Star, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  if (!user) {
    router.push("/login")
    return null
  }

  const profileStats = [
    { label: "Listings", value: "12", icon: Package, href: "/profile/listings" },
    { label: "Favorites", value: "8", icon: Heart, href: "/wishlist" },
    { label: "Messages", value: "3", icon: MessageCircle, href: "/messages" },
  ]

  const menuItems = [
    { label: "My Listings", href: "/profile/listings", icon: Package },
    { label: "Purchase History", href: "/profile/purchases", icon: Package },
    { label: "Reviews", href: "/profile/reviews", icon: Star },
    { label: "Settings", href: "/profile/settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-semibold">Profile</h1>
        <Link href="/profile/settings">
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </Link>
      </header>

      <div className="p-4 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="bg-purple-600 text-white text-xl">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-600">4.8 (23 reviews)</span>
                </div>
                <p className="text-sm text-purple-600 mt-1">Miami Gardens, FL</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          {profileStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} href={stat.href}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <Icon className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant="ghost" className="w-full justify-between bg-transparent hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Button>
                </Link>
              )
            })}
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
              onClick={logout}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
