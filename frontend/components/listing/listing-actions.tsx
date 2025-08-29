"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ChevronDown, Clock, X } from "lucide-react"

interface ListingActionsProps {
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryActions?: Array<{
    label: string
    onClick: () => void
  }>
  tags?: string[]
  onTagClick?: (tag: string) => void
  bottomAction?: {
    label: string
    onClick?: () => void
    hoursInfo?: {
      title: string
      hours: Array<{
        day: string
        time: string
      }>
    }
  }
  address?: string
}

export function ListingActions({
  primaryAction,
  secondaryActions = [],
  tags = [],
  onTagClick,
  bottomAction,
  address,
}: ListingActionsProps) {
  const [showHours, setShowHours] = useState(false)

  return (
    <>
      <div className="space-y-4 px-2 sm:px-0">
        {/* Address Section */}
        {address && (
          <div className="text-center px-2">
            <span className="text-sm text-gray-900">{address}</span>
          </div>
        )}

        {/* Primary action button */}
        {primaryAction && (
          <Button
            onClick={primaryAction.onClick}
            className="w-full bg-green-500 hover:bg-green-600 hover:scale-[1.02] active:scale-[0.98] text-white rounded-full py-3 transition-all shadow-lg"
          >
            {primaryAction.label}
          </Button>
        )}

        {/* Secondary action buttons */}
        {secondaryActions.length > 0 && (
          <div className="flex gap-2 justify-center">
            {secondaryActions.map((action, index) => (
              <Button
                key={index}
                variant="secondary"
                onClick={action.onClick}
                className="bg-black hover:bg-gray-800 hover:scale-105 active:scale-95 text-white rounded-full px-3 sm:px-4 py-1 text-sm transition-all flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex justify-center px-2">
            <div className="flex gap-2 justify-center">
              {tags.map((tag, index) => {
                // Determine kosher tag color based on content - matching image tag styling
                const getKosherTagColor = (tagText: string) => {
                  const lowerTag = tagText.toLowerCase();
                  if (lowerTag.includes('parve') || lowerTag.includes('pareve') || lowerTag.includes('neutral')) {
                    return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
                  } else if (lowerTag.includes('meat') || lowerTag.includes('fleishig')) {
                    return 'bg-red-100 text-red-700 hover:bg-red-200';
                  } else if (lowerTag.includes('dairy') || lowerTag.includes('milchig')) {
                    return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
                  } else if (lowerTag.includes('pas yisroel') || lowerTag.includes('cholov yisroel')) {
                    return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
                  } else {
                    return 'bg-green-100 text-green-700 hover:bg-green-200';
                  }
                };

                return (
                  <Button
                    key={index}
                    variant="secondary"
                    onClick={() => onTagClick?.(tag)}
                    className={`${getKosherTagColor(tag)} hover:scale-105 active:scale-95 rounded-full px-3 sm:px-4 py-1 text-sm transition-all flex-1`}
                  >
                    {tag}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom action */}
        {bottomAction && (
          <Button
            onClick={() => {
              if (bottomAction.hoursInfo) {
                setShowHours(true)
              } else {
                bottomAction.onClick?.()
              }
            }}
            variant="secondary"
            className="w-full bg-black hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] text-white rounded-full py-2 transition-all flex items-center justify-center gap-2"
          >
            {bottomAction.hoursInfo && <Clock size={16} />}
            {bottomAction.label} {/* Updated button text to "action pop-up" */}
            {bottomAction.hoursInfo && <ChevronDown size={16} />}
          </Button>
        )}
      </div>

      {bottomAction?.hoursInfo && showHours && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-2 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">{bottomAction.hoursInfo.title}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHours(false)}
                  className="h-7 w-7 p-0 hover:bg-gray-200 rounded-full"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>

            {/* Hours content */}
            <div className="p-4">
              <div className="space-y-2">
                {bottomAction.hoursInfo.hours.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-600 font-medium text-sm">{item.day}</span>
                    <span className="text-gray-900 font-semibold bg-gray-50 px-2 py-0.5 rounded-full text-xs">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
