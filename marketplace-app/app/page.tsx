import { Header } from "@/components/header"
import { CategoryNav } from "@/components/category-nav"
import { ActionButtons } from "@/components/action-buttons"
import { LocationDisplay } from "@/components/location-display"
import { ProductGrid } from "@/components/product-grid"
import { BottomNav } from "@/components/bottom-nav"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <CategoryNav />
      <div className="px-4 py-4 space-y-4">
        <ActionButtons />
        <LocationDisplay />
        <ProductGrid />
      </div>
      <BottomNav />
    </div>
  )
}
