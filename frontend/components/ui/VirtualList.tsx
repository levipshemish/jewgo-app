import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { Restaurant } from '@/lib/types/restaurant';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items, height, itemHeight, renderItem, overscan = 5, className = '', onScroll, onEndReached, endReachedThreshold = 0.8
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(height / itemHeight);
    const end = Math.min(start + visibleCount + overscan, items.length);
    const startWithOverscan = Math.max(0, start - overscan);
    
    return {
      start: startWithOverscan,
      end,
      startOffset: startWithOverscan * itemHeight
    };
  }, [scrollTop, itemHeight, height, overscan, items.length]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);

    // Check if we need to load more items
    if (onEndReached) {
      const scrollPercentage = newScrollTop / (items.length * itemHeight - height);
      if (scrollPercentage >= endReachedThreshold) {
        onEndReached();
      }
    }
  }, [onScroll, onEndReached, items.length, itemHeight, height, endReachedThreshold]);

  // Scroll to specific item
  // const scrollToItem = useCallback((index: number) => {
  //   if (containerRef.current) {
  //     const targetScrollTop = index * itemHeight;
  //     containerRef.current.scrollTo({
  //       top: targetScrollTop,
  //       behavior: 'smooth'
  //     });
  //   }
  // }, [itemHeight]);

  // Scroll to top
  // const scrollToTop = useCallback(() => {
  //   if (containerRef.current) {
  //     containerRef.current.scrollTo({
  //       top: 0,
  //       behavior: 'smooth'
  //     });
  //   }
  // }, []);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange.start, visibleRange.end]);

  // Total height for scroll container
  const totalHeight = items.length * itemHeight;

  return (
    <div className={`virtual-list ${className}`}>
      <div
        ref={containerRef}
        className="virtual-list-container"
        style={{
          height,
          overflow: 'auto',
          position: 'relative'
        }}
        onScroll={handleScroll}
      >
        <div
          ref={scrollRef}
          className="virtual-list-content"
          style={{
            height: totalHeight,
            position: 'relative'
          }}
        >
          <div
            className="virtual-list-items"
            style={{
              position: 'absolute',
              top: visibleRange.startOffset,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.map(({ item, index }) => (
              <div
                key={index}
                className="virtual-list-item"
                style={{
                  height: itemHeight,
                  position: 'relative'
                }}
              >
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Specialized virtual list for restaurants
interface VirtualRestaurantListProps {
  restaurants: Restaurant[];
  height: number;
  itemHeight: number;
  renderRestaurant: (restaurant: Restaurant, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  className?: string;
}

export function VirtualRestaurantList({
  restaurants, height, itemHeight, renderRestaurant, onLoadMore, hasMore = false, loading = false, className = ''
}: VirtualRestaurantListProps) {
  const [displayedRestaurants, setDisplayedRestaurants] = useState<Restaurant[]>([]);
  const [_page, setPage] = useState(1);

  // Load more items when needed
  const handleEndReached = useCallback(() => {
    if (hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Update displayed restaurants when the full list changes
  useEffect(() => {
    setDisplayedRestaurants(restaurants);
    setPage(1);
  }, [restaurants]);

  return (
    <div className={`virtual-restaurant-list ${className}`}>
      <VirtualList
        items={displayedRestaurants}
        height={height}
        itemHeight={itemHeight}
        renderItem={renderRestaurant}
        overscan={10}
        onEndReached={handleEndReached}
        endReachedThreshold={0.9}
      />
      
      {loading && (
        <div className="virtual-list-loading">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-jewgo-primary"></div>
            <span className="ml-2 text-sm text-gray-600">Loading more restaurants...</span>
          </div>
        </div>
      )}
      
      {!hasMore && displayedRestaurants.length > 0 && (
        <div className="virtual-list-end">
          <div className="text-center py-4 text-sm text-gray-500">
            No more restaurants to load
          </div>
        </div>
      )}
    </div>
  );
}

// Performance optimized restaurant card for virtual list
interface VirtualRestaurantCardProps {
  restaurant: Restaurant;
  index: number;
  onClick?: (restaurant: Restaurant) => void;
  showDistance?: boolean;
  userLocation?: { latitude: number; longitude: number };
}

export function VirtualRestaurantCard({
  restaurant, onClick, showDistance = false, userLocation
}: VirtualRestaurantCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Memoized distance calculation
  const distance = useMemo(() => {
    if (!showDistance || !userLocation || !restaurant.latitude || !restaurant.longitude) {
      return null;
    }

    const R = 3959; // Earth's radius in miles
    const dLat = (restaurant.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (restaurant.longitude - userLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(restaurant.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  }, [restaurant.latitude, restaurant.longitude, userLocation, showDistance]);

  const handleClick = useCallback(() => {
    onClick?.(restaurant);
  }, [onClick, restaurant]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <div
      className="virtual-restaurant-card bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
      onClick={handleClick}
      style={{ contain: 'layout style paint' }}
    >
      <div className="flex items-start space-x-3">
        {/* Restaurant Image */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
            {!imageError ? (
              <img
                src={restaurant.image_url || '/images/default-restaurant.webp'}
                alt={restaurant.name}
                className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-500 text-xs">No Image</span>
              </div>
            )}
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {restaurant.name}
          </h3>
          
          <p className="text-xs text-gray-600 truncate">
            {restaurant.address}
          </p>
          
          <div className="flex items-center space-x-2 mt-1">
            {restaurant.kosher_category && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {restaurant.kosher_category}
              </span>
            )}
            
            {distance && (
              <span className="text-xs text-gray-500">
                {distance} mi
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
