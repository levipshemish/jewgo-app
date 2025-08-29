"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"

interface ListingImageProps {
  src?: string
  alt: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function ListingImage({ src, alt, actionLabel = "action", onAction, className = "" }: ListingImageProps) {
  return (
    <div className={`relative aspect-[4/3] rounded-3xl overflow-hidden ${className}`}>
      {src ? (
        <Image src={src || "/placeholder.svg"} alt={alt} fill className="object-cover rounded-3xl" />
      ) : (
        <div className="relative h-full rounded-3xl overflow-hidden">
          <Image
            src="/modern-product-showcase-with-clean-background.png"
            alt="Mock product image"
            fill
            className="object-cover rounded-3xl"
          />
        </div>
      )}

      {onAction && (
        <Button
          onClick={onAction}
          className="absolute bottom-4 right-4 bg-white text-gray-600 hover:bg-gray-50 hover:scale-105 transition-all rounded-full px-6"
          size="sm"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
