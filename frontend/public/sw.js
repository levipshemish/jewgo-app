// JewGo SW – navigation bypass to avoid redirect/page breakages
const CACHE_VERSION = 'v2025-08-13-nav-bypass-v1';
const CACHE_NAME = `jewgo-${CACHE_VERSION}`;
const RESTAURANTS_CACHE = `jewgo-restaurants-${CACHE_VERSION}`;

// URLs to cache - only cache resources that actually exist
const urlsToCache = [
  '/',
  '/live-map'
  // Removed API endpoints from initial cache as they may not be available during install
];

// Install event - cache static assets with error handling
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((_cache) => {
        // Cache each URL individually to handle failures gracefully
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url).catch(error => {
            // Don't fail the entire installation if one URL fails
            return Promise.resolve();
          });
        });
        return Promise.all(cachePromises);
      })
      .catch(error => {
        // Don't fail the service worker installation
        return Promise.resolve();
      })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for health endpoints to prevent interference
  if (url.pathname.startsWith('/healthz') || url.pathname.startsWith('/api/health')) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip caching for Next.js static assets to prevent MIME type issues
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip caching for Next.js data (RSC / flight / data) endpoints
  if (url.pathname.startsWith('/_next/data/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip caching for CSS files to prevent MIME type issues
  if (url.pathname.endsWith('.css') || url.searchParams.has('dpl')) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip caching for font files to prevent MIME type issues
  if (url.pathname.match(/\.(woff|woff2|ttf|eot)$/)) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip caching for admin-proxy requests to prevent interference
  if (url.pathname.startsWith('/api/admin-proxy/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip caching for all API routes except the explicit restaurants handler below
  if (url.pathname.startsWith('/api/') && url.pathname !== '/api/restaurants') {
    event.respondWith(fetch(request));
    return;
  }

  // Detect navigation requests
  const isNavigation = 
    request.mode === 'navigate' ||
    (request.destination === '' && request.headers.get('accept')?.includes('text/html'));

  // For navigation requests, do NOT intercept or cache. Let the browser handle it.
  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const offline = await cache.match('/');
          if (offline && !offline.redirected && offline.status === 200) {
            return offline;
          }
        } catch (_) {}
        return new Response('<!doctype html><title>Offline</title><h1>Offline</h1><p>Please check your connection.</p>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // Handle restaurant API requests
  if (url.pathname === '/api/restaurants') {
    event.respondWith(
      caches.open(RESTAURANTS_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((response) => {
              // Return cached response if available
              if (response) {
                return response;
              }

              // Fetch from network and cache
              return fetch(request)
                .then((networkResponse) => {
                  // Only cache successful responses
                  if (networkResponse.ok) {
                    // Clone the response before caching
                    const responseToCache = networkResponse.clone();
                    cache.put(request, responseToCache).catch(() => {
                      // Silently fail cache operations
                    });
                  }
                  return networkResponse;
                })
                .catch((error) => {
                  // Return empty response if network fails
                  return new Response(JSON.stringify({
                    restaurants: [],
                    pagination: { count: 0 }
                  }), {
                    headers: { 'Content-Type': 'application/json' }
                  });
                });
            });
        })
        .catch((error) => {
          // Fallback to network request
          return fetch(request).catch(() => {
            return new Response(JSON.stringify({
              restaurants: [],
              pagination: { count: 0 }
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(request).catch((error) => {
          // Return a basic offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          // Return a minimal response instead of 503
          return new Response('Network error', { 
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => ![CACHE_NAME, RESTAURANTS_CACHE].includes(k))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Background sync for restaurant data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-restaurants') {
    // Simple in-memory rate limit to avoid frequent syncs if SW stays alive
    // Limits to at most once every 5 minutes
    self.__LAST_RESTAURANTS_SYNC__ = self.__LAST_RESTAURANTS_SYNC__ || 0;
    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;
    if (now - self.__LAST_RESTAURANTS_SYNC__ < FIVE_MIN) {
      return; // Skip if rate-limited
    }
    self.__LAST_RESTAURANTS_SYNC__ = now;

    // Fetch a smaller page and mark request as SW-originated
    event.waitUntil(
      fetch('/api/restaurants?limit=100&offset=0', { headers: { 'x-sw-sync': '1' }, cache: 'no-store' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          return caches.open(RESTAURANTS_CACHE)
            .then((cache) => {
              return cache.put('/api/restaurants', new Response(JSON.stringify(data)));
            });
        })
        .catch((error) => {
          // Silently handle sync errors
        })
    );
  }
});
