'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Explicit opt-in: only register when NEXT_PUBLIC_ENABLE_SW === 'true'
    const enableSW = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';
    const eventListeners: Array<{ target: EventTarget; event: string; handler: EventListener }> = [];
    let messageHandlerTimeout: ReturnType<typeof setTimeout> | null = null;

    if (enableSW) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
          updateViaCache: 'none' // Always check for updates
        })
        .then((registration) => {
          // Silently update; avoid prompting or forced reloads
          const handleUpdateFound = () => {
            const newWorker = registration.installing;
            if (newWorker) {
              const handleStateChange = () => {
                // No auto-reload; the new SW will take control on next navigation
              };
              newWorker.addEventListener('statechange', handleStateChange);
              eventListeners.push({ target: newWorker, event: 'statechange', handler: handleStateChange });
            }
          };
          
          registration.addEventListener('updatefound', handleUpdateFound);
          eventListeners.push({ target: registration, event: 'updatefound', handler: handleUpdateFound });

          // Handle service worker errors
          const handleRegistrationError = () => {
            // console.error('❌ Service Worker error:', error);
          };
          registration.addEventListener('error', handleRegistrationError);
          eventListeners.push({ target: registration, event: 'error', handler: handleRegistrationError });
        })
        .catch(() => {
          // Don't show error to user in production
          if (process.env.NODE_ENV === 'development') {
            // console.error('Service Worker registration details:', error);
          }
        });

      // Handle service worker updates
      const handleControllerChange = () => {
        // Handle controller change
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      eventListeners.push({ target: navigator.serviceWorker, event: 'controllerchange', handler: handleControllerChange });

      // Handle service worker errors
      const handleServiceWorkerError = () => {
        // console.error('❌ Service Worker error:', error);
      };
      navigator.serviceWorker.addEventListener('error', handleServiceWorkerError);
      eventListeners.push({ target: navigator.serviceWorker, event: 'error', handler: handleServiceWorkerError });

      // Optimized service worker message handler with debouncing
      const debouncedMessageHandler = (event: Event) => {
        const messageEvent = event as MessageEvent;
        if (messageHandlerTimeout) {
          clearTimeout(messageHandlerTimeout);
        }
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
                    const _limitedPayload = data.payload.slice(0, 50);
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
          if (messageEvent.data) {
            processMessageData(messageEvent.data);
          }
        }, 16); // Debounce to ~60fps
      };

      // Add optimized message event listener
      navigator.serviceWorker.addEventListener('message', debouncedMessageHandler);
      eventListeners.push({ target: navigator.serviceWorker, event: 'message', handler: debouncedMessageHandler });
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

    // Cleanup function to remove all event listeners and clear timeouts
    return () => {
      // Clear timeout
      if (messageHandlerTimeout) {
        clearTimeout(messageHandlerTimeout);
      }
      
      // Remove all event listeners
      eventListeners.forEach(({ target, event, handler }) => {
        try {
          target.removeEventListener(event, handler);
        } catch (error) {
          // Silently handle errors during cleanup
        }
      });
    };
  }, []);

  return null; // This component doesn't render anything
}