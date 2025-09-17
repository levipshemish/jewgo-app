"use client"

import { useCallback, useMemo } from "react"
import { ArrowLeft, Heart, Share, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

type KosherType = "meat" | "dairy" | "parve" | "pareve" | string

interface ListingHeaderProps {
  kosherType?: KosherType
  kosherAgency?: string
  kosherAgencyWebsite?: string
  shareCount?: number
  viewCount?: number
  onBack?: () => void
  onFavorite?: () => void
  isFavorited?: boolean
  tags?: string[]
  onShared?: () => void // optional hook to show a toast/snackbar upstream
}

const AGENCY_LINKS: Array<{ test: RegExp; url: string }> = [
  // ORB (Orthodox Rabbinical Board)
  { test: /\b(orb|orthodox\s+rabbinical\s+board)\b/i, url: "https://www.orbkosher.com/" },
  // Kosher Miami / Vaad
  { test: /\b(kosher\s*miami|vaad(\s+ha?kashrus)?|miami[-\s]?dade)\b/i, url: "https://koshermiami.org/" },
  // Add more agencies here as needed:
  // { test: /\b(ou|orthodox\s+union)\b/i, url: "https://oukosher.org/" },
]

function resolveAgencyUrl(agency?: string, explicit?: string): string | null {
  if (explicit) return explicit
  if (!agency) return null
  for (const entry of AGENCY_LINKS) {
    if (entry.test.test(agency)) return entry.url
  }
  return null
}

function kosherColor(type?: KosherType): string {
  const t = type?.toLowerCase()
  if (t === "meat") return "text-red-600 dark:text-red-400"
  if (t === "dairy") return "text-blue-600 dark:text-blue-400"
  if (t === "parve" || t === "pareve") return "text-amber-600 dark:text-amber-400"
  return "text-muted-foreground"
}

function formatCount(n?: number): string {
  if (typeof n !== "number") return "0"
  const fmt = new Intl.NumberFormat(undefined, { notation: n >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 })
  return fmt.format(n)
}

export function ListingHeader({
  kosherType,
  kosherAgency,
  kosherAgencyWebsite,
  shareCount,
  viewCount,
  onBack,
  onFavorite,
  isFavorited = false,
  tags = [],
  onShared,
}: ListingHeaderProps) {

  const agencyUrl = useMemo(
    () => resolveAgencyUrl(kosherAgency, kosherAgencyWebsite),
    [kosherAgency, kosherAgencyWebsite]
  )

  const handleAgencyClick = useCallback(() => {
    if (!agencyUrl) return
    window.open(agencyUrl, "_blank", "noopener,noreferrer")
  }, [agencyUrl])

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (navigator.share) {
        await navigator.share({ title: "Check this out", url })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        // Ultimate fallback for ancient browsers
        const sel = document.createElement("input")
        sel.value = url
        document.body.appendChild(sel)
        sel.select()
        document.execCommand("copy")
        sel.remove()
      }
      onShared?.()
    } catch {
      // swallow; upstream toast can show an error if desired
    }
  }, [onShared])

  const kosherTypeClass = kosherColor(kosherType)

  return (
    <div className="flex justify-center px-4">
      <div
        className="
          inline-flex items-center gap-1 py-1 pl-1 pr-1.5 rounded-full mt-6
          max-w-full overflow-hidden
          bg-background/80 dark:bg-background/60
          border border-border/60
          backdrop-blur supports-[backdrop-filter]:backdrop-blur
          shadow-md
        "
      >
        {/* Back */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Go back"
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        )}

        {/* Kosher type */}
        {kosherType && (
          <span
            className={`text-base font-semibold whitespace-nowrap flex-shrink-0 ${kosherTypeClass}`}
            title={kosherType}
          >
            {kosherType}
          </span>
        )}

        {/* Kosher agency */}
        {kosherAgency && (
          <div className="min-w-0 max-w-40">
            {agencyUrl ? (
              <button
                onClick={handleAgencyClick}
                className="text-base font-medium text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors rounded px-1 truncate w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={kosherAgency}
                aria-label={`Open ${kosherAgency} website`}
              >
                {kosherAgency}
              </button>
            ) : (
              <span
                className="text-base font-medium text-muted-foreground px-1 truncate block"
                title={kosherAgency}
              >
                {kosherAgency}
              </span>
            )}
          </div>
        )}

        {/* Optional tags */}
        {tags.length > 0 && (
          <div className="hidden md:flex items-center gap-1 pl-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground truncate max-w-28"
                title={t}
              >
                {t}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* View count */}
        {typeof viewCount === "number" && viewCount >= 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground whitespace-nowrap flex-shrink-0 pl-1">
            <Eye className="h-5 w-5" aria-hidden="true" />
            <span className="text-base font-semibold tabular-nums">{formatCount(viewCount)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center -space-x-1 pl-1">
          {typeof shareCount !== "undefined" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              aria-label="Share"
              className="h-10 w-10 p-0"
            >
              <Share className="h-6 w-6" aria-hidden="true" />
            </Button>
          )}

          {onFavorite && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onFavorite}
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorited}
              className="h-10 w-10 p-0 group"
            >
              <Heart
                className={`h-6 w-6 transition-colors ${
                  isFavorited
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground group-hover:fill-red-500 group-hover:text-red-500"
                }`}
                aria-hidden="true"
              />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}