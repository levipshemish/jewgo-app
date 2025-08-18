import type { Metadata } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { NotificationsProvider } from '@/lib/contexts/NotificationsContext'
import { NextAuthProvider } from '@/components/auth/NextAuthProvider'
import Analytics from '@/components/analytics/Analytics'
import { CustomHead } from './head'
import ServiceWorkerRegistration from '@/components/ui/ServiceWorkerRegistration'
import { FontOptimizer } from '@/components/ui/FontOptimizer'
import { roboto } from './fonts'
import Script from 'next/script'
import HeadGuard from '@/components/dev/HeadGuard'
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
  return (
    <html lang="en" className={`${roboto.variable} h-full`}>
      <head>
        {/* Google Analytics */}
        {process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID'] && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID']}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID']}', {
                  page_title: document.title,
                  page_location: window.location.href,
                });
              `}
            </Script>
          </>
        )}
        
        {/* App version tracking and mobile optimizations */}
        <Script id="app-version" strategy="afterInteractive">
          {`
            window.APP_VERSION = '${process.env.NEXT_PUBLIC_APP_VERSION || Date.now()}';
            
            // Mobile Touch Event Fixes - optimized for performance
            (function() {
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              
              if (isMobile) {
                document.addEventListener('DOMContentLoaded', function() {
                  const clickableElements = document.querySelectorAll('button, a, [role="button"], [onClick], [data-clickable="true"], .restaurant-card, .eatery-card');
                  
                  clickableElements.forEach(function(element) {
                    if (!element.hasAttribute('data-touch-fixed')) {
                      element.setAttribute('data-touch-fixed', 'true');
                      element.style.touchAction = 'manipulation';
                      element.style.webkitTapHighlightColor = 'rgba(0, 0, 0, 0.1)';
                      element.style.webkitTouchCallout = 'none';
                      element.style.webkitUserSelect = 'none';
                      element.style.userSelect = 'none';
                      element.style.pointerEvents = 'auto';
                      
                      if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
                        element.style.minHeight = '44px';
                        element.style.minWidth = '44px';
                      }
                      
                      element.style.position = 'relative';
                      element.style.zIndex = '10';
                    }
                  });
                });
                
                // Fix for iOS Safari specific issues
                if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                  const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="tel"]');
                  inputs.forEach(function(input) {
                    input.style.fontSize = '16px';
                  });
                }
              }
            })();
          `}
        </Script>
      </head>
      <body className="h-full antialiased font-sans">
        <CustomHead />
        <ErrorBoundary>
          <NextAuthProvider>
            <NotificationsProvider>
              <FontOptimizer>
                <div 
                  className="min-h-full bg-[#f4f4f4] flex flex-col"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: 'manipulation'
                  }}
                >
                  {children}
                </div>
              </FontOptimizer>
              <Analytics />
              <ServiceWorkerRegistration />
              {process.env.NEXT_PUBLIC_ENV !== "prod" ? <HeadGuard /> : null}
            </NotificationsProvider>
          </NextAuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
} 