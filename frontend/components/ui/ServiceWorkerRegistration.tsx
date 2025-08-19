'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Explicit opt-in: only register when NEXT_PUBLIC_ENABLE_SW === 'true'
      const enableSW = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

      if (enableSW) {
        // Register service worker
        navigator.serviceWorker
          .register('/sw.js', {
            scope: '/',
            updateViaCache: 'none' // Always check for updates
          })
          .then((registration) => {
            // Silently update; avoid prompting or forced reloads
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  // No auto-reload; the new SW will take control on next navigation
                });
              }
            });

            // Handle service worker errors
            registration.addEventListener('error', () => {
              // console.error('❌ Service Worker error:', error);
            });
          })
          .catch(() => {
            // Don't show error to user in production
            if (process.env.NODE_ENV === 'development') {
              // console.error('Service Worker registration details:', error);
            }
          });

        // Handle service worker updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          });

        // Handle service worker errors
        navigator.serviceWorker.addEventListener('error', () => {
          // console.error('❌ Service Worker error:', error);
        });

        // Optimized service worker message handler with debouncing
        let messageHandlerTimeout: ReturnType<typeof setTimeout>;
        const debouncedMessageHandler = (event: MessageEvent) => {
          clearTimeout(messageHandlerTimeout);
          messageHandlerTimeout = setTimeout(() => {
            // Process message data in chunks to prevent blocking
            const processMessageData = (data: any) => {
              // Limit processing time to prevent long-running handlers
              const startTime = performance.now();
              const maxProcessingTime = 10; // 10ms max processing time
              
              try {
                // Handle different message types with lightweight processing
                if (data && typeof data === 'object') {
                  // Process only essential data to prevent performance issues
                  if (data.type === 'cache-update') {
                    // Handle cache updates
                    return;
                  }
                  if (data.type === 'restaurant-data') {
                    // Handle restaurant data updates - limit payload size
                    if (data.payload && Array.isArray(data.payload)) {
                      // Only process first 50 items to prevent blocking
                      const limitedPayload = data.payload.slice(0, 50);
                      // Process limited payload
                    }
                    return;
                  }
                  if (data.type === 'location-update') {
                    // Handle location updates
                    return;
                  }
                }
                
                // Check if we're exceeding processing time
                if (performance.now() - startTime > maxProcessingTime) {
                  // Abort processing to prevent long-running handler
                  return;
                }
              } catch {
                // Silently handle errors to prevent console spam
              }
            };
            
            // Process message data
            if (event.data) {
              processMessageData(event.data);
            }
          }, 16); // Debounce to ~60fps
        };

        // Add optimized message event listener
        navigator.serviceWorker.addEventListener('message', debouncedMessageHandler);
      } else {
        // If SW is not enabled, attempt to unregister any existing registrations and clear app caches
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister().catch(() => {}));
        }).catch(() => {});
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.filter((k) => k.startsWith('jewgo-')).forEach((k) => caches.delete(k));
          }).catch(() => {});
        }
      }
    } else {
      }
  }, []);

  return null; // This component doesn't render anything
}
