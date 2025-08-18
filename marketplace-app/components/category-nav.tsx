"use client"

import { Building2, Church, Ticket, Store, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const categories = [
  { name: "Mikvahs", icon: Building2, slug: "mikvahs" },
  { name: "Shuls", icon: Church, slug: "shuls" },
  { name: "Specials", icon: Ticket, slug: "specials" },
  { name: "Marketplace", icon: Store, slug: "marketplace" },
  { name: "Stores", icon: ShoppingCart, slug: "stores" },
]

export function CategoryNav() {
  const pathname = usePathname()

  const isActive = (slug: string) => {
    return (pathname === "/" && slug === "marketplace") || pathname.includes(`/category/${slug}`)
  }

  return (
    <nav className="bg-white px-4 py-4">
      <div className="flex justify-between items-center">
        {categories.map((category) => {
          const Icon = category.icon
          const active = isActive(category.slug)
          const href = category.slug === "marketplace" ? "/" : `/category/${category.slug}`

          return (
            <Link key={category.name} href={href} className="flex flex-col items-center gap-2">
              <div
                className={`p-3 rounded-2xl transition-colors ${
                  active ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-sm transition-colors ${active ? "text-purple-600 font-medium" : "text-gray-600"}`}>
                {category.name}
              </span>
            </Link>
          )
        })}
      </div>
      {/* Active indicator line */}
      <div className="mt-4 flex justify-center">
        <div className="w-12 h-1 bg-purple-600 rounded-full"></div>
      </div>
    </nav>
  )
}
