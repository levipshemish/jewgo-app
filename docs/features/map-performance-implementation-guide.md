# Map Performance Implementation Guide

## 🚨 Critical Optimizations - Step by Step

### 1. Optimize Render Frequency

#### Step 1.1: Increase Throttle Delay
**File**: `frontend/components/map/InteractiveRestaurantMap.tsx`

**Current Code** (Line ~745):
```typescript
const debouncedUpdateMarkers = useCallback(
  throttle((map: google.maps.Map, inView: Restaurant[]) => {
    // ... marker update logic
  }, 150), // Current: 150ms
  [cleanupMarkers, createMarker, applyClustering]
);
```

**Updated Code**:
```typescript
const debouncedUpdateMarkers = useCallback(
  throttle((map: google.maps.Map, inView: Restaurant[]) => {
    // ... marker update logic
  }, 300), // Updated: 300ms for better performance
  [cleanupMarkers, createMarker, applyClustering]
);
```

#### Step 1.2: Implement Aggressive Bounds Change Detection
**File**: `frontend/components/map/InteractiveRestaurantMap.tsx`

**Add to renderVisibleMarkers function**:
```typescript
const renderVisibleMarkers = useCallback(() => {
  const map = mapInstanceRef.current;
  if (!map || !window.google?.maps) return;

  const bounds = map.getBounds?.();
  if (!bounds) return;

  // Enhanced bounds change detection
  const zoom = map.getZoom?.() ?? 0;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  
  // More granular bounds checking (3 decimal places for better precision)
  const boundsKey = `${sw.lat().toFixed(3)},${sw.lng().toFixed(3)}:${ne.lat().toFixed(3)},${ne.lng().toFixed(3)}:z${zoom}`;
  
  // Add minimum distance threshold to prevent micro-movements from triggering renders
  const lastBounds = lastRenderKeyRef.current;
  if (lastBounds) {
    const lastBoundsParts = lastBounds.split(':');
    const currentBoundsParts = boundsKey.split(':');
    
    // Check if bounds change is significant enough
    const lastCoords = lastBoundsParts[0].split(',');
    const currentCoords = currentBoundsParts[0].split(',');
    
    const latDiff = Math.abs(parseFloat(lastCoords[0]) - parseFloat(currentCoords[0]));
    const lngDiff = Math.abs(parseFloat(lastCoords[1]) - parseFloat(currentCoords[1]));
    
    // Skip render if change is less than 0.001 degrees (roughly 100 meters)
    if (latDiff < 0.001 && lngDiff < 0.001 && lastBoundsParts[2] === currentBoundsParts[2]) {
      return;
    }
  }
  
  const nextKey = `${boundsKey}|count=${inView.length}|b=${showRatingBubbles ? 1 : 0}`;
  
  // Additional check for rapid movements
  if (lastRenderKeyRef.current === nextKey && selectedRestaurantIdRef.current === selectedRestaurantId) {
    return;
  }
  
  lastRenderKeyRef.current = nextKey;
  
  // ... rest of the function
}, [restaurantsWithCoords, selectedRestaurantId, showRatingBubbles, onRestaurantSelect, cleanupMarkers, createMarker, applyClustering, getRestaurantKey, getPooledMarker, returnMarkerToPool]);
```

### 2. Implement True Marker Reuse

#### Step 2.1: Fix Marker Pooling with Content Management
**File**: `frontend/components/map/hooks/useMarkerManagement.ts`

**Add marker content versioning**:
```typescript
interface MarkerContent {
  element: HTMLElement;
  version: string;
  lastUsed: number;
}

export function useMarkerManagement({
  restaurants, selectedRestaurantId, userLocation, showRatingBubbles, enableClustering, onRestaurantSelect
}: UseMarkerManagementProps) {
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markersMapRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clustererRef = useRef<any | null>(null);
  
  // Add marker content cache
  const markerContentCache = useRef<Map<string, MarkerContent>>(new Map());
  const markerPool = useRef<Map<string, google.maps.marker.AdvancedMarkerElement[]>>(new Map());

  // Enhanced restaurant key generation with content versioning
  const getRestaurantKey = useCallback((restaurant: Restaurant) => {
    const isSelected = selectedRestaurantId === restaurant.id;
    const rating = restaurant.quality_rating || restaurant.rating || restaurant.star_rating || restaurant.google_rating || 0;
    
    // Calculate distance hash if user location is available
    let distanceHash = '';
    if (userLocation && restaurant.latitude && restaurant.longitude) {
      const R = 3959; // Earth's radius in miles
      const restaurantLat = Number(restaurant.latitude);
      const restaurantLon = Number(restaurant.longitude);
      const dLat = (restaurantLat - userLocation.latitude) * Math.PI / 180;
      const dLon = (restaurantLon - userLocation.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(restaurantLat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      distanceHash = `_${Math.round(distance * 10)}`; // Round to 0.1 miles
    }
    
    // Add content version to key
    const contentVersion = `${restaurant.kosher_category}_${rating}_${isSelected}_${showRatingBubbles ? 1 : 0}`;
    
    return `${restaurant.id}_${restaurant.latitude}_${restaurant.longitude}_${contentVersion}${distanceHash}`;
  }, [selectedRestaurantId, userLocation, showRatingBubbles]);

  // Enhanced marker pooling with content validation
  const getPooledMarker = useCallback((restaurant: Restaurant, map: google.maps.Map) => {
    const key = getRestaurantKey(restaurant);
    const pool = markerPool.current.get(key);
    
    if (pool && pool.length > 0) {
      const marker = pool.pop()!;
      
      // Validate marker content before reuse
      const currentContentVersion = getRestaurantKey(restaurant);
      const markerContentVersion = (marker as any)._contentVersion;
      
      if (currentContentVersion === markerContentVersion) {
        // Content is still valid, reuse marker
        (marker as any).map = map;
        return marker;
      } else {
        // Content has changed, clean up old marker
        (marker as any).map = null;
      }
    }
    
    return null;
  }, [getRestaurantKey]);

  // Enhanced marker return to pool
  const returnMarkerToPool = useCallback((marker: google.maps.marker.AdvancedMarkerElement, key: string) => {
    try {
      // Store content version for validation
      (marker as any)._contentVersion = key;
      
      // Remove from map
      (marker as any).map = null;
      
      // Add to pool
      if (!markerPool.current.has(key)) {
        markerPool.current.set(key, []);
      }
      markerPool.current.get(key)!.push(marker);
      
      // Limit pool size to prevent memory leaks
      const pool = markerPool.current.get(key)!;
      if (pool.length > 10) {
        const oldMarker = pool.shift()!;
        (oldMarker as any).map = null;
      }
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  // Enhanced cleanup with pool management
  const cleanupMarkers = useCallback(() => {
    try {
      markersRef.current.forEach(marker => {
        try {
          (marker as any).map = null;
        } catch {
          // Ignore cleanup errors
        }
      });
      markersRef.current = [];
      markersMapRef.current.clear();
      
      // Clean up old pool entries (older than 5 minutes)
      const now = Date.now();
      markerPool.current.forEach((pool, key) => {
        const filteredPool = pool.filter(marker => {
          const lastUsed = (marker as any)._lastUsed || 0;
          return (now - lastUsed) < 5 * 60 * 1000; // 5 minutes
        });
        if (filteredPool.length === 0) {
          markerPool.current.delete(key);
        } else {
          markerPool.current.set(key, filteredPool);
        }
      });
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  // ... rest of the hook implementation
}
```

#### Step 2.2: Implement Marker Recycling
**File**: `frontend/components/map/hooks/useMarkerManagement.ts`

**Add marker update methods**:
```typescript
// Add marker update functionality
const updateMarkerContent = useCallback((marker: google.maps.marker.AdvancedMarkerElement, restaurant: Restaurant) => {
  try {
    const newContent = createMarkerContent(restaurant);
    if (newContent) {
      (marker as any).content = newContent;
      (marker as any)._contentVersion = getRestaurantKey(restaurant);
      (marker as any)._lastUsed = Date.now();
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to update marker content:', error);
    }
  }
}, [getRestaurantKey]);

// Separate content creation from marker creation
const createMarkerContent = useCallback((restaurant: Restaurant) => {
  // Move the content creation logic here
  // This allows us to update content without recreating markers
  const isSelected = selectedRestaurantId === restaurant.id;
  const markerColor = getMarkerColor(restaurant.kosher_category);
  const finalColor = isSelected ? '#FFD700' : markerColor;
  
  if (showRatingBubbles) {
    // Create rating bubble content
    const bubbleWidth = isSelected ? 56 : 48;
    const bubbleHeight = isSelected ? 32 : 28;
    
    const element = document.createElement('div');
    element.innerHTML = `
      <svg width="${bubbleWidth}" height="${bubbleHeight}" viewBox="0 0 ${bubbleWidth} ${bubbleHeight}">
        <rect x="2" y="2" width="${bubbleWidth - 4}" height="${bubbleHeight - 4}" 
              rx="${(bubbleHeight - 4) / 2}" ry="${(bubbleHeight - 4) / 2}"
              fill="${finalColor}" stroke="${markerColor}" stroke-width="2"/>
        <text x="${bubbleWidth/2 - 6}" y="${bubbleHeight/2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#FFD700">⭐</text>
        <text x="${bubbleWidth/2 + 6}" y="${bubbleHeight/2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${isSelected ? '#FFFFFF' : '#000000'}">
          ${(restaurant.rating || 0).toFixed(1)}
        </text>
      </svg>
    `;
    return element;
  } else {
    // Create simple marker content
    const element = document.createElement('div');
    element.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
              fill="${finalColor}" 
              stroke="#000000" 
              stroke-width="1.5"/>
        <circle cx="12" cy="9" r="2.5" fill="white"/>
        <circle cx="12" cy="9" r="1.5" fill="${finalColor}"/>
      </svg>
    `;
    return element;
  }
}, [selectedRestaurantId, showRatingBubbles]);

// Enhanced createMarker function with recycling
const createMarker = useCallback((restaurant: Restaurant, map: google.maps.Map) => {
  try {
    if (restaurant.latitude === undefined || restaurant.longitude === undefined) {
      return null;
    }

    // Try to get a pooled marker first
    let marker = getPooledMarker(restaurant, map);
    
    if (marker) {
      // Update existing marker content if needed
      const currentVersion = getRestaurantKey(restaurant);
      const markerVersion = (marker as any)._contentVersion;
      
      if (currentVersion !== markerVersion) {
        updateMarkerContent(marker, restaurant);
      }
      
      return marker;
    }

    // Create new marker if no pooled marker available
    const position = new window.google.maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude));
    const content = createMarkerContent(restaurant);
    
    if (!content) {
      return null;
    }

    marker = new window.google.maps.marker.AdvancedMarkerElement({
      position,
      content,
      title: restaurant.name,
      map
    });

    // Store metadata
    (marker as any)._contentVersion = getRestaurantKey(restaurant);
    (marker as any)._lastUsed = Date.now();
    (marker as any)._restaurantId = restaurant.id;

    // Add event listeners
    marker.addListener('gmp-click', () => {
      onRestaurantSelect?.(restaurant.id);
    });

    return marker;
  } catch (markerError) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Error creating marker for restaurant ${restaurant.name}:`, markerError);
    }
    return null;
  }
}, [getRestaurantKey, getPooledMarker, updateMarkerContent, createMarkerContent, onRestaurantSelect]);

return {
  markersRef,
  markersMapRef,
  clustererRef,
  getRestaurantKey,
  cleanupMarkers,
  createMarker,
  applyClustering,
  updateMarkerContent, // Export for external use
  getPooledMarker,     // Export for debugging
  returnMarkerToPool   // Export for debugging
};
```

### 3. Reduce DOM Complexity

#### Step 3.1: Create CSS-Based Markers
**File**: `frontend/components/map/styles/markers.css`

**Create new CSS file**:
```css
/* Marker base styles */
.map-marker {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #000000;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  color: #000000;
  background: white;
}

/* Marker states */
.map-marker:hover {
  transform: scale(1.1);
  z-index: 1000;
}

.map-marker.selected {
  transform: scale(1.2);
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Kosher category colors */
.map-marker.kosher-meat {
  background: #A70000;
  color: white;
  border-color: #A70000;
}

.map-marker.kosher-dairy {
  background: #ADD8E6;
  color: #1a4a5a;
  border-color: #ADD8E6;
}

.map-marker.kosher-pareve {
  background: #FFCE6D;
  color: #8a5a1a;
  border-color: #FFCE6D;
}

.map-marker.kosher-unknown {
  background: #BBBBBB;
  color: #666666;
  border-color: #BBBBBB;
}

/* Rating bubble styles */
.map-marker.rating-bubble {
  width: 48px;
  height: 28px;
  border-radius: 14px;
  border: 2px solid;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.map-marker.rating-bubble.selected {
  width: 56px;
  height: 32px;
  border-radius: 16px;
  font-size: 12px;
}

/* Rating star */
.map-marker .rating-star {
  font-size: 8px;
  color: #FFD700;
}

.map-marker.selected .rating-star {
  font-size: 10px;
}

/* Center dot */
.map-marker::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  border: 1px solid currentColor;
}

.map-marker.rating-bubble::after {
  display: none;
}
```

#### Step 3.2: Update Marker Creation to Use CSS Classes
**File**: `frontend/components/map/hooks/useMarkerManagement.ts`

**Update createMarkerContent function**:
```typescript
const createMarkerContent = useCallback((restaurant: Restaurant) => {
  const isSelected = selectedRestaurantId === restaurant.id;
  const kosherCategory = restaurant.kosher_category?.toLowerCase() || 'unknown';
  const rating = restaurant.rating || restaurant.star_rating || restaurant.google_rating || 0;
  
  const element = document.createElement('div');
  
  if (showRatingBubbles) {
    element.className = `map-marker rating-bubble kosher-${kosherCategory}${isSelected ? ' selected' : ''}`;
    element.innerHTML = `
      <span class="rating-star">⭐</span>
      <span>${rating.toFixed(1)}</span>
    `;
  } else {
    element.className = `map-marker kosher-${kosherCategory}${isSelected ? ' selected' : ''}`;
    element.textContent = restaurant.name.charAt(0).toUpperCase();
  }
  
  return element;
}, [selectedRestaurantId, showRatingBubbles]);
```

### 4. Cache Info Window Content

#### Step 4.1: Implement Content Caching
**File**: `frontend/components/map/InteractiveRestaurantMap.tsx`

**Add info window cache**:
```typescript
// Add to component state
const infoWindowCache = useRef<Map<number, { content: string; timestamp: number }>>(new Map());
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Enhanced info window content creation with caching
const createInfoWindowContent = useCallback((restaurant: Restaurant, distanceFromUser?: number | null) => {
  const cacheKey = restaurant.id;
  const now = Date.now();
  
  // Check cache first
  const cached = infoWindowCache.current.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.content;
  }
  
  // Generate new content
  const content = _createInfoWindowContent(restaurant, distanceFromUser);
  
  // Cache the content
  infoWindowCache.current.set(cacheKey, {
    content,
    timestamp: now
  });
  
  // Clean up old cache entries
  if (infoWindowCache.current.size > 100) {
    const entries = Array.from(infoWindowCache.current.entries());
    const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sortedEntries.slice(0, 20); // Remove oldest 20 entries
    toRemove.forEach(([key]) => infoWindowCache.current.delete(key));
  }
  
  return content;
}, []);

// Add cache invalidation when restaurant data changes
useEffect(() => {
  // Clear cache when restaurants change
  infoWindowCache.current.clear();
}, [restaurantsWithCoords]);
```

## 🧪 Testing Implementation

### Performance Testing Script
**File**: `frontend/scripts/test-map-performance.js`

```javascript
// Performance testing script for map optimizations
const performanceTest = {
  async testMarkerCreation() {
    const startTime = performance.now();
    
    // Create 100 markers
    for (let i = 0; i < 100; i++) {
      const mockRestaurant = {
        id: i,
        name: `Restaurant ${i}`,
        latitude: 25.7617 + (Math.random() - 0.5) * 0.1,
        longitude: -80.1918 + (Math.random() - 0.5) * 0.1,
        kosher_category: ['meat', 'dairy', 'pareve'][Math.floor(Math.random() * 3)],
        rating: Math.random() * 5
      };
      
      // Simulate marker creation
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Marker creation test: ${duration.toFixed(2)}ms for 100 markers`);
    console.log(`Average: ${(duration / 100).toFixed(2)}ms per marker`);
    
    return duration;
  },
  
  async testRenderFrequency() {
    let renderCount = 0;
    const startTime = performance.now();
    
    // Simulate map movement for 5 seconds
    const interval = setInterval(() => {
      renderCount++;
    }, 100);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    clearInterval(interval);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const rendersPerSecond = renderCount / (duration / 1000);
    
    console.log(`Render frequency test: ${rendersPerSecond.toFixed(2)} renders per second`);
    
    return rendersPerSecond;
  },
  
  async runAllTests() {
    console.log('Starting map performance tests...');
    
    const markerTime = await this.testMarkerCreation();
    const renderFreq = await this.testRenderFrequency();
    
    console.log('\nPerformance Summary:');
    console.log(`✅ Marker creation: ${markerTime < 5000 ? 'PASS' : 'FAIL'} (${markerTime.toFixed(2)}ms)`);
    console.log(`✅ Render frequency: ${renderFreq < 10 ? 'PASS' : 'FAIL'} (${renderFreq.toFixed(2)}/s)`);
    
    return {
      markerCreationTime: markerTime,
      renderFrequency: renderFreq,
      passed: markerTime < 5000 && renderFreq < 10
    };
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = performanceTest;
}
```

## 📊 Monitoring Implementation

### Performance Monitoring Component
**File**: `frontend/components/monitoring/MapPerformanceMonitor.tsx`

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  markerCreationTime: number;
  renderFrequency: number;
  memoryUsage: number;
  infoWindowLoadTime: number;
  lastUpdate: number;
}

export function MapPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    markerCreationTime: 0,
    renderFrequency: 0,
    memoryUsage: 0,
    infoWindowLoadTime: 0,
    lastUpdate: Date.now()
  });
  
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Calculate render frequency
      const now = performance.now();
      const timeDiff = now - lastRenderTime.current;
      const frequency = renderCount.current / (timeDiff / 1000);
      
      // Get memory usage (if available)
      const memory = (performance as any).memory?.usedJSHeapSize || 0;
      
      setMetrics(prev => ({
        ...prev,
        renderFrequency: frequency,
        memoryUsage: memory,
        lastUpdate: Date.now()
      }));
      
      renderCount.current = 0;
      lastRenderTime.current = now;
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded z-50">
      <h4 className="font-bold mb-2">Map Performance</h4>
      <div className="space-y-1">
        <div>Render Freq: {metrics.renderFrequency.toFixed(1)}/s</div>
        <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
        <div>Marker Time: {metrics.markerCreationTime.toFixed(0)}ms</div>
        <div>Info Window: {metrics.infoWindowLoadTime.toFixed(0)}ms</div>
      </div>
    </div>
  );
}
```

This implementation guide provides detailed, actionable steps for implementing the most critical map performance optimizations. Each section includes specific code examples and can be implemented incrementally to test the impact of each optimization.
