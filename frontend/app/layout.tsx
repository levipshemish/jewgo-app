import React from 'react';
import type { Metadata } from 'next'

import './globals.css'
import Script from 'next/script'

import Analytics from '@/components/analytics/Analytics'
import { appLogger } from '@/lib/utils/logger'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
// Remove FontOptimizer to prevent font preload warnings
// import { FontOptimizer } from '@/components/ui/FontOptimizer'
import ServiceWorkerRegistration from '@/components/ui/ServiceWorkerRegistration'
import { NotificationsProvider } from '@/lib/contexts/NotificationsContext'
import { LocationProvider } from '@/lib/contexts/LocationContext'
import { AuthProvider } from '@/contexts/AuthContext'

import RelayEmailBanner from '@/components/ui/RelayEmailBanner'

// PostgreSQL Authentication - Migration from Supabase
import { nexa } from './fonts'
import { CustomHead } from './head'
import { featureGuard } from '@/lib/feature-guard';
import { ScrollProvider } from '@/lib/hooks/useScrollDetection';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';

export const metadata: Metadata = {
  metadataBase: new URL('https://jewgo.app'),
  title: 'Jewgo - Find Your Kosher Eatery',
  description: 'Discover the best kosher restaurants, synagogues, and Jewish businesses in your area.',
  keywords: 'kosher, restaurants, Jewish, eatery, synagogue, mikvah, stores',
  authors: [{ name: 'Jewgo Team' }],
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.webp', type: 'image/webp' }
    ],
    apple: '/icon.webp',
    shortcut: '/favicon.ico'
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Jewgo',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Jewgo - Find Your Kosher Eatery',
    description: 'Discover the best kosher restaurants, synagogues, and Jewish businesses in your area.',
    url: 'https://jewgo.app',
    siteName: 'Jewgo',
    images: [
      {
        url: '/icon.webp',
        width: 810,
        height: 810,
        alt: 'Jewgo Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jewgo - Find Your Kosher Eatery',
    description: 'Discover the best kosher restaurants, synagogues, and Jewish businesses in your area.',
    images: ['/icon.webp'],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#74E1A0',
  viewportFit: 'cover',
}

export default function RootLayout({
  children, }: {
  children: React.ReactNode
}) {
  // Initialize Feature Guard at boot time
  if (typeof window !== 'undefined') {
    // Client-side initialization
    featureGuard.validateFeatures().catch(error => {
      appLogger.error('Failed to initialize Feature Guard', { error: String(error) });
    });
  }

  return (
    <html lang="en" className={`${nexa.className} h-full`} data-scroll-behavior="smooth">
      <head>
        {/* Viewport meta tag for proper mobile layout */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX' && (
          <>
            {/* Preconnects instead of preload to avoid unused-preload warning */}
            <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
            <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="" />
            <Script
              id="ga-loader"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <Script
              id="ga-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', ${JSON.stringify(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)}, {
                    page_title: document.title,
                    page_location: window.location.href,
                  });
                `
              }}
            />
          </>
        )}
        
        {/* App version tracking */}
        <Script
          id="app-version"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.APP_VERSION = ${JSON.stringify(process.env.NEXT_PUBLIC_APP_VERSION || String(Date.now()))};`
          }}
        />
      </head>
      <body className="h-full antialiased font-sans">
        <CustomHead />
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <NotificationsProvider>
                <LocationProvider>
                  <ScrollProvider>
                    <div 
                        className="min-h-full flex flex-col"
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          WebkitTouchCallout: 'none'
                        }}
                      >
                        <RelayEmailBanner />
                        {children}
                      </div>
                    <Analytics />
                    <ServiceWorkerRegistration />

                  </ScrollProvider>
                </LocationProvider>
              </NotificationsProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
} 
