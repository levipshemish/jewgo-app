import { User } from "lucide-react"
import { useImageLoader } from "@/hooks/useImageLoader"

interface ProfileImageProps {
  src?: string | null
  alt: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8", 
  lg: "w-12 h-12"
}

export function ProfileImage({ 
  src, 
  alt, 
  size = "md", 
  className = "" 
}: ProfileImageProps) {
  const { src: imageSrc, isLoading, hasError } = useImageLoader({
    src,
    retryCount: 1,
    retryDelay: 500
  })

  const sizeClass = sizeClasses[size]
  const iconSize = size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-6 w-6"

  if (!src || hasError || isLoading) {
    return (
      <div className={`${sizeClass} bg-gray-200 rounded-full flex items-center justify-center ${className}`}>
        <User className={`${iconSize} text-gray-500`} />
      </div>
    )
  }

  return (
    <img 
      src={imageSrc || src} 
      alt={alt}
      className={`${sizeClass} rounded-full object-cover ${className}`}
      onError={(e) => {
        // Hide the failed image and show fallback
        e.currentTarget.style.display = 'none'
        e.currentTarget.nextElementSibling?.classList.remove('hidden')
      }}
    />
  )
}