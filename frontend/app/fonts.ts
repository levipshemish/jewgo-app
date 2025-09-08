// Temporarily disable Next.js font loader to avoid CSS syntax issues
// Using CSS imports instead
export const nexa = {
  className: 'font-nexa',
  variable: '--font-nexa',
  style: {
    fontFamily: 'Nexa, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },
}

// Fallback font configuration for Docker/offline builds
export const fallbackFonts = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  fontVariable: '--font-fallback',
}
