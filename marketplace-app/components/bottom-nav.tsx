"use client"

import { Search, Heart, Store, Bell, User } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

const navItems = [
  { name: "Explore", icon: Search, href: "/" },
  { name: "Wishlist", icon: Heart, href: "/wishlist" },
  { name: "Marketplace", icon: Store, href: "/", active: true },
  { name: "Notifications", icon: Bell, href: "/notifications" },
  { name: "Profile", icon: User, href: "/profile" },
]

export function BottomNav() {
  const { user } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-between items-center">
        {navItems.map((item) => {
          const Icon = item.icon
          const href = item.name === "Profile" ? (user ? "/profile" : "/login") : item.href

          return (
            <Link key={item.name} href={href} className="flex flex-col items-center gap-1 py-2">
              <Icon className={`w-6 h-6 ${item.active ? "text-purple-600" : "text-gray-400"}`} />
              <span className={`text-xs ${item.active ? "text-purple-600 font-medium" : "text-gray-400"}`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
