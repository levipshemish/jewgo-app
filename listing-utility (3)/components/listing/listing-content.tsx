"use client"

import { Button } from "@/components/ui/button"
import { Star, MapPin } from "lucide-react"

interface ListingContentProps {
  leftText?: string
  rightText?: string
  leftAction?: string
  rightAction?: string
  leftBold?: boolean
  rightBold?: boolean
  leftIcon?: React.ReactNode | string
  rightIcon?: React.ReactNode | string
  onLeftAction?: () => void
  onRightAction?: () => void
}

// Icon mapping for string-based icons
const iconMap = {
  "star": Star,
  "map-pin": MapPin,
}

function renderIcon(icon: React.ReactNode | string | undefined) {
  if (!icon) return null
  
  if (typeof icon === 'string') {
    const IconComponent = iconMap[icon as keyof typeof iconMap]
    return IconComponent ? <IconComponent className="h-3 w-3" /> : null
  }
  
  return icon
}

export function ListingContent({
  leftText,
  rightText,
  leftAction,
  rightAction,
  leftBold = false,
  rightBold = false,
  leftIcon,
  rightIcon,
  onLeftAction,
  onRightAction,
}: ListingContentProps) {
  return (
    <div className="space-y-1">
      {/* Text row */}
      {(leftText || rightText) && (
        <div className="flex justify-between items-center">
          <span className={`text-sm text-gray-900 ${leftBold ? 'font-bold' : ''}`}>
            {leftIcon && <span className="inline-block mr-1">{renderIcon(leftIcon)}</span>}
            {leftText || "text box"}
          </span>
          <span className={`text-sm text-gray-900 ${rightBold ? 'font-bold' : ''}`}>
            {rightText || "text box"}
            {rightIcon && <span className="inline-block ml-1">{renderIcon(rightIcon)}</span>}
          </span>
        </div>
      )}

      {/* Action row */}
      {(leftAction || rightAction || onLeftAction || onRightAction) && (
        <div className="flex justify-between items-center">
          <span className={`text-sm text-gray-900 ${leftBold ? 'font-bold' : ''}`}>
            {leftAction || "text box"}
          </span>
          {onRightAction ? (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRightAction} 
              className="text-sm text-gray-600 h-auto p-0 hover:bg-transparent hover:text-gray-800"
            >
              {rightIcon && <span className="inline-block mr-1">{renderIcon(rightIcon)}</span>}
              {rightAction || "action"}
            </Button>
          ) : (
            <span className={`text-sm text-gray-900 ${rightBold ? 'font-bold' : ''}`}>
              {rightAction || "action"}
              {rightIcon && <span className="inline-block ml-1">{renderIcon(rightIcon)}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
