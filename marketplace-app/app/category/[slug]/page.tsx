"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Filter, SortAsc } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductGrid } from "@/components/product-grid"
import { BottomNav } from "@/components/bottom-nav"

const categoryData = {
  mikvahs: {
    title: "Mikvahs",
    description: "Find mikvahs in your area",
    icon: "🏛️",
  },
  shuls: {
    title: "Shuls",
    description: "Synagogues and prayer services",
    icon: "🕍",
  },
  specials: {
    title: "Special Offers",
    description: "Limited time deals and discounts",
    icon: "🎫",
  },
  marketplace: {
    title: "Marketplace",
    description: "Buy and sell items in your community",
    icon: "🏪",
  },
  stores: {
    title: "Stores",
    description: "Local businesses and shops",
    icon: "🛒",
  },
}

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const category = categoryData[slug as keyof typeof categoryData]

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h1>
          <Button onClick={() => router.push("/")} className="bg-purple-600 hover:bg-purple-700">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center justify-between shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="font-semibold">{category.title}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <SortAsc className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="p-4">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-2">{category.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{category.title}</h2>
          <p className="text-gray-600">{category.description}</p>
        </div>

        <ProductGrid />
      </div>

      <BottomNav />
    </div>
  )
}
