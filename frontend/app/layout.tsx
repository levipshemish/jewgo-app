import type { Metadata } from 'next'

import './globals.css'
import Script from 'next/script'

import Analytics from '@/components/analytics/Analytics'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
// Remove FontOptimizer to prevent font preload warnings
// import { FontOptimizer } from '@/components/ui/FontOptimizer'
import ServiceWorkerRegistration from '@/components/ui/ServiceWorkerRegistration'
import { NotificationsProvider } from '@/lib/contexts/NotificationsContext'
import { LocationProvider } from '@/lib/contexts/LocationContext'
import DevNavigation from '@/components/dev/DevNavigation'
import RelayEmailBanner from '@/components/ui/RelayEmailBanner'

// NextAuth removed - using Supabase only
import { roboto } from './fonts'
import { CustomHead } from './head'
import { initializeFeatureGuard } from '@/lib/feature-guard';

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
    initializeFeatureGuard().catch(error => {
      console.error('Failed to initialize Feature Guard:', error);
    });
  }

  return (
    <html lang="en" className={`${roboto.variable} h-full`} data-scroll-behavior="smooth">
      <head>
        {/* Targeted CSS protection - only removes CSS files masquerading as scripts */}
        <Script id="css-protection" strategy="beforeInteractive">
          {`
            (function() {
              // Only remove script tags that are clearly CSS files
              function removeCssScripts() {
                const scripts = document.querySelectorAll('script[src*=".css"]');
                scripts.forEach(script => {
                  if (script.src && script.src.includes('.css')) {
                    console.warn('Removing CSS file loaded as script:', script.src);
                    script.remove();
                  }
                });
              }
              
              // Run immediately
              removeCssScripts();
              
              // Run after DOM is ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', removeCssScripts);
              }
              
              // Monitor for new script tags (but don't override createElement)
              const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                  mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SCRIPT') {
                      const script = node;
                      if (script.src && script.src.includes('.css')) {
                        console.warn('Removing dynamically added CSS script:', script.src);
                        script.remove();
                      }
                    }
                  });
                });
              });
              
              // Only observe for new script tags, don't interfere with existing ones
              observer.observe(document.head, {
                childList: true,
                subtree: false
              });
            })();
          `}
        </Script>
        
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX' && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                    page_title: document.title,
                    page_location: window.location.href,
                  });
                `,
              }}
            />
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
            <NotificationsProvider>
              <LocationProvider>
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
                    <RelayEmailBanner />
                    {children}
                  </div>
                <Analytics />
                <ServiceWorkerRegistration />
                <DevNavigation />
        
              </LocationProvider>
            </NotificationsProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
} 
