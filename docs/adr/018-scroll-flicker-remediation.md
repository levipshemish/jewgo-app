## ADR 018: Scroll Flicker Remediation for Card Grids

Date: 2025-09-02

Context
- Users reported visible flickering on card grids when scrolling, especially on desktop. Cards appeared to “reload” while the page moved.
- Root causes identified:
  - Global CSS reset during scroll (`.scrolling * { transform: none }`) forced layer teardown and rebuild on every frame.
  - Aggressive global GPU hints (`translateZ(0)`, `backface-visibility`) applied to `html`, `body`, and `img`, which, combined with the reset above, produced layer thrash.
  - UnifiedCard swapped between a plain `div` and a `motion.div` based on scroll state, causing remounts and reload-like flicker.
  - Backdrop filter on the image tag badge caused expensive repaints on iOS/desktop during scroll.

Decision
- Stop global transform resets during scroll; only disable transitions/animations to reduce jank.
- Remove broad `translateZ(0)` hacks on `html`, `body`, `img`; scope performance hints to card internals only.
- Always render a single `motion.div` in `UnifiedCard` and switch animation variants (no DOM node swap) to avoid remounts.
- Remove `backdrop-filter` on the tag badge and scope containment to avoid heavy repaints.
- Suppress hover-scale while actively scrolling on desktop to prevent hover/scroll interaction flicker.

Changes
- frontend/app/globals.css
  - Removed `transform` and `backface-visibility` on `html`, `body`, `img`.
  - Changed `.scrolling *` to only disable `transition`/`animation` (not `transform`).
  - Scoped `contain` away from `html, body` to preserve scrolling.
- frontend/components/ui/UnifiedCard.tsx
  - Always render one `motion.div`; use `animate={isScrolling ? 'scroll' : 'visible'}`.
- frontend/components/ui/UnifiedCard.module.css
  - Removed card-level `translateZ(0)`/`perspective`; keep `will-change: auto`.
  - Promote only the image on hover; disable hover promotion while `.scrolling`.
  - Removed `backdrop-filter` from `.unified-card-tag`; added `contain: layout paint`.
- frontend/app/layout.tsx
  - Google Analytics: replace preload with preconnect; set `preload={false}` on Script to avoid unused-preload warnings.
- frontend/lib/hooks/useScrollDetection.tsx
  - Marked as client module (`"use client"`); used by `layout.tsx` and cards.

Status
- Implemented and validated manually on affected pages; desktop-specific flicker resolved per reporter.

Consequences
- Reduced global layer churn; improved scroll smoothness across pages.
- Slightly less aggressive GPU promotion globally; targeted where it matters (images).

Rollback
- If any regressions appear, revert the files above to the previous commit and re-enable only the minimal subset required for the target page. Avoid reintroducing global `transform: none` under `.scrolling`.

Validation Steps
- Hard refresh and test:
  - `/eatery`, `/marketplace` card grids: scroll with mouse resting over cards (desktop) and with touch (mobile).
  - Verify: no flicker/reload effect; images load smoothly; hover scale disabled while actively scrolling.

