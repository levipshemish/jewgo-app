import { Roboto } from 'next/font/google'

// Main font configuration with optimized preloading
export const roboto = Roboto({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  preload: false,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  variable: '--font-roboto',
  adjustFontFallback: true,
})
