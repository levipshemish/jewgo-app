import { Roboto } from 'next/font/google'

// Configure Roboto font with optimized loading to prevent preload warnings
// Added Docker build compatibility with fallback handling
export const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap', // Use swap to prevent layout shift and preload warnings
  preload: false, // Disable preload for Docker builds to avoid Google Fonts issues
  fallback: ['system-ui', 'arial'], // Provide fallback fonts
  adjustFontFallback: true, // Adjust fallback font metrics
  variable: '--font-roboto', // CSS variable for easy access
})

// Fallback font configuration for Docker/offline builds
export const fallbackFonts = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontVariable: '--font-fallback',
}
