"use client"

import { Phone, Globe, Mail, Clock } from "lucide-react"
import { useState } from "react"
import styles from "./listing.module.css"

interface ListingActionsProps {
  primaryAction?: {
    label?: string
    onClick?: () => void
  }
  secondaryActions?: Array<{
    label?: string
    onClick?: () => void
    disabled?: boolean
  }>
  bottomAction?: {
    label?: string
    onClick?: () => void
    hoursInfo?: {
      title: string
      hours: Array<{
        day: string
        time: string
      }>
    }
  }
  kosherTags?: string[]
  address?: string
}

export function ListingActions({
  primaryAction,
  secondaryActions,
  bottomAction,
  kosherTags,
  address
}: ListingActionsProps) {
  const [showHours, setShowHours] = useState(false)

  const handleEmail = (email?: string) => {
    if (email) {
      window.location.href = `mailto:${email}`
    } else {
      alert('No email available for this restaurant')
    }
  }

  const getKosherTagClass = (tag: string) => {
    const lowerTag = tag.toLowerCase()
    if (lowerTag.includes('parve') || lowerTag.includes('pareve')) return styles.listingKosherTag + ' ' + styles.parve
    if (lowerTag.includes('meat')) return styles.listingKosherTag + ' ' + styles.meat
    if (lowerTag.includes('dairy')) return styles.listingKosherTag + ' ' + styles.dairy
    if (lowerTag.includes('cholov') || lowerTag.includes('pas')) return styles.listingKosherTag + ' ' + styles.special
    return styles.listingKosherTag + ' ' + styles.certification
  }

  return (
    <>
      <div className={styles.listingActions}>
        <div className={styles.listingActionsCard}>
          {/* Address Section */}
          {address && (
            <div className={styles.listingAddress}>
              📍 {address}
            </div>
          )}

          {/* Primary action button */}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className={styles.listingPrimaryButton}
            >
              {primaryAction.label || "Order Now"}
            </button>
          )}

          {/* Secondary action buttons */}
          {secondaryActions && secondaryActions.length > 0 && (
            <div className={styles.listingSecondaryButtons}>
              {secondaryActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`${styles.listingSecondaryButton} ${action.disabled ? 'disabled' : ''}`}
                >
                  {action.label === "Website" && <Globe className="h-4 w-4 mr-1" />}
                  {action.label === "Call" && <Phone className="h-4 w-4 mr-1" />}
                  {action.label === "Email" && <Mail className="h-4 w-4 mr-1" />}
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Kosher tags */}
          {kosherTags && kosherTags.length > 0 && (
            <div className={styles.listingKosherTags}>
              {kosherTags.slice(0, 3).map((tag, index) => (
                <span key={index} className={getKosherTagClass(tag)}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Bottom action button */}
          {bottomAction && (
            <button
              onClick={() => {
                if (bottomAction.hoursInfo) {
                  setShowHours(true)
                } else {
                  bottomAction.onClick?.()
                }
              }}
              className={styles.listingBottomButton}
            >
              <Clock className="h-4 w-4 mr-2" />
              {bottomAction.label || "Hours"}
            </button>
          )}
        </div>
      </div>

      {/* Hours Popup */}
      {showHours && bottomAction?.hoursInfo && (
        <div className={styles.listingPopup} onClick={() => setShowHours(false)}>
          <div className={styles.listingPopupContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.listingPopupHeader}>
              <h3 className={styles.listingPopupTitle}>{bottomAction.hoursInfo.title}</h3>
              <button className={styles.listingPopupClose} onClick={() => setShowHours(false)}>
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {bottomAction.hoursInfo.hours.map((hour, index) => (
                <div key={index} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <span className="font-medium text-gray-900">{hour.day}</span>
                  <span className="text-gray-600">{hour.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
