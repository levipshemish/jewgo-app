import { Roboto } from 'next/font/google'

// Configure Roboto font with optimized loading to prevent preload warnings
export const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap', // Use swap to prevent layout shift and preload warnings
  preload: true, // Keep preload but with proper configuration
  fallback: ['system-ui', 'arial'], // Provide fallback fonts
  adjustFontFallback: true, // Adjust fallback font metrics
  variable: '--font-roboto', // CSS variable for easy access
})
