// Temporarily disable Next.js font loader to avoid CSS syntax issues
// Using CSS imports instead
export const roboto = {
  className: 'font-roboto',
  variable: '--font-roboto',
  style: {
    fontFamily: 'Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },
}

// Fallback font configuration for Docker/offline builds
export const fallbackFonts = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontVariable: '--font-fallback',
}
