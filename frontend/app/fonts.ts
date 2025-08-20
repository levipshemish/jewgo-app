import { Inter } from 'next/font/google'

// Use Inter font which is more reliable, or fallback to system fonts
export const roboto = Inter({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  variable: '--font-roboto',
  adjustFontFallback: true,
})
