/**
 * Mobile Optimization Service for JewGo Frontend
 * ==============================================
 * 
 * This service provides mobile-specific optimizations for the JewGo frontend,
 * including touch-friendly interactions, performance optimizations, and
 * mobile-specific UI enhancements.
 * 
 * Features:
 * - Touch-friendly interactions
 * - Performance optimizations
 * - Mobile-specific UI enhancements
 * - Responsive design utilities
 * - Mobile gesture support
 * - Battery optimization
 * 
 * Author: JewGo Development Team
 * Version: 1.0
 * Last Updated: 2025-01-27
 */

import { useEffect, useState, useCallback, useRef } from 'react';

// Mobile detection utilities
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') {return false;}
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
};

export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') {return false;}
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getDevicePixelRatio = (): number => {
  if (typeof window === 'undefined') {return 1;}
  
  return window.devicePixelRatio || 1;
};

// Mobile performance optimizations
export const useMobileOptimization = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') {return false;}
    return isMobileDevice();
  });
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') {return false;}
    return isTouchDevice();
  });
  const [pixelRatio, setPixelRatio] = useState(() => {
    if (typeof window === 'undefined') {return 1;}
    return getDevicePixelRatio();
  });
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window === 'undefined') {return 0;}
    return window.innerHeight;
  });
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window === 'undefined') {return 0;}
    return window.innerWidth;
  });

  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(isMobileDevice());
      setIsTouch(isTouchDevice());
      setPixelRatio(getDevicePixelRatio());
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };

    // Only update if we're in the browser and haven't set initial values
    if (typeof window !== 'undefined') {
      updateMobileState();
      window.addEventListener('resize', updateMobileState);
      window.addEventListener('orientationchange', updateMobileState);

      return () => {
        window.removeEventListener('resize', updateMobileState);
        window.removeEventListener('orientationchange', updateMobileState);
      };
    }
  }, []);

  return {
    isMobile,
    isTouch,
    pixelRatio,
    viewportHeight,
    viewportWidth,
  };
};

// Touch-friendly interactions
export const useTouchInteractions = () => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) {return null;}

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (Math.abs(distanceX) > minSwipeDistance && isHorizontalSwipe) {
      return distanceX > 0 ? 'left' : 'right';
    }

    if (Math.abs(distanceY) > minSwipeDistance && !isHorizontalSwipe) {
      return distanceY > 0 ? 'up' : 'down';
    }

    return null;
  }, [touchStart, touchEnd]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

// Mobile gesture support
export const useMobileGestures = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void
) => {
  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchInteractions();

  const handleTouchEnd = useCallback(() => {
    const swipeDirection = onTouchEnd();
    
    switch (swipeDirection) {
      case 'left':
        onSwipeLeft?.();
        break;
      case 'right':
        onSwipeRight?.();
        break;
      case 'up':
        onSwipeUp?.();
        break;
      case 'down':
        onSwipeDown?.();
        break;
    }
  }, [onTouchEnd, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

// Mobile performance hooks
export const useMobilePerformance = () => {
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // Check for low power mode (iOS)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setIsLowPowerMode(battery.level < 0.2);
        
        battery.addEventListener('levelchange', () => {
          setIsLowPowerMode(battery.level < 0.2);
        });
      });
    }

    // Check for slow connection
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setIsSlowConnection(connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
      
      connection.addEventListener('change', () => {
        setIsSlowConnection(connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
      });
    }
  }, []);

  return {
    isLowPowerMode,
    isSlowConnection,
  };
};

// Mobile-specific UI utilities
export const getMobileSpacing = (baseSpacing: number, isMobile: boolean): number => {
  return isMobile ? baseSpacing * 1.2 : baseSpacing;
};

export const getMobileFontSize = (baseSize: number, isMobile: boolean): number => {
  return isMobile ? Math.max(baseSize, 16) : baseSize; // Minimum 16px for mobile
};

export const getMobileTouchTarget = (baseSize: number, isMobile: boolean): number => {
  return isMobile ? Math.max(baseSize, 44) : baseSize; // Minimum 44px touch target
};

// Mobile scroll optimization
export const useMobileScroll = (containerRef: React.RefObject<HTMLElement>) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [containerRef, handleScroll]);

  return { isScrolling };
};

// Mobile image optimization
export const useMobileImageOptimization = () => {
  const { isMobile, pixelRatio } = useMobileOptimization();

  const getOptimizedImageUrl = useCallback((
    originalUrl: string,
    mobileWidth: number = 400,
    desktopWidth: number = 800
  ): string => {
    if (!originalUrl) {return originalUrl;}

    const width = isMobile ? mobileWidth : desktopWidth;
    const optimizedWidth = Math.round(width * pixelRatio);

    // Add image optimization parameters
    const url = new URL(originalUrl, window.location.origin);
    url.searchParams.set('w', optimizedWidth.toString());
    url.searchParams.set('q', '85'); // Quality
    url.searchParams.set('fm', 'webp'); // Format
    url.searchParams.set('fit', 'crop'); // Fit mode

    return url.toString();
  }, [isMobile, pixelRatio]);

  return { getOptimizedImageUrl };
};

// Mobile lazy loading
export const useMobileLazyLoading = () => {
  const { isSlowConnection } = useMobilePerformance();
  const { isMobile } = useMobileOptimization();

  const getLazyLoadingConfig = useCallback(() => {
    if (isSlowConnection) {
      return {
        threshold: 0.1,
        rootMargin: '50px',
        delay: 200,
      };
    }

    if (isMobile) {
      return {
        threshold: 0.2,
        rootMargin: '100px',
        delay: 100,
      };
    }

    return {
      threshold: 0.3,
      rootMargin: '200px',
      delay: 50,
    };
  }, [isMobile, isSlowConnection]);

  return { getLazyLoadingConfig };
};

// Mobile battery optimization
export const useMobileBatteryOptimization = () => {
  const { isLowPowerMode } = useMobilePerformance();

  const getBatteryOptimizedConfig = useCallback(() => {
    if (isLowPowerMode) {
      return {
        reduceAnimations: true,
        lowerImageQuality: true,
        disableAutoPlay: true,
        reducePolling: true,
        cacheAggressively: true,
      };
    }

    return {
      reduceAnimations: false,
      lowerImageQuality: false,
      disableAutoPlay: false,
      reducePolling: false,
      cacheAggressively: false,
    };
  }, [isLowPowerMode]);

  return { getBatteryOptimizedConfig };
};

// Mobile accessibility utilities
export const useMobileAccessibility = () => {
  const { isMobile, isTouch } = useMobileOptimization();

  const getAccessibilityConfig = useCallback(() => {
    return {
      // Increase touch targets on mobile
      minTouchTarget: isMobile ? 44 : 32,
      
      // Increase font sizes for better readability
      minFontSize: isMobile ? 16 : 14,
      
      // Add more spacing for touch interactions
      touchSpacing: isMobile ? 8 : 4,
      
      // Enable touch feedback
      enableTouchFeedback: isTouch,
      
      // Optimize for screen readers
      screenReaderOptimized: true,
    };
  }, [isMobile, isTouch]);

  return { getAccessibilityConfig };
};

// Mobile CSS utilities
export const mobileStyles = {
  // Touch-friendly button styles
  touchButton: {
    minHeight: '44px',
    minWidth: '44px',
    padding: '12px 16px',
    fontSize: '16px',
    touchAction: 'manipulation' as const,
    WebkitTapHighlightColor: 'transparent',
  },

  // Mobile-optimized card styles
  mobileCard: {
    borderRadius: '12px',
    padding: '16px',
    margin: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },

  // Mobile-friendly input styles
  mobileInput: {
    fontSize: '16px', // Prevents zoom on iOS
    padding: '12px 16px',
    minHeight: '44px',
    border: '1px solid #ddd',
    borderRadius: '8px',
  },

  // Mobile-optimized list styles
  mobileList: {
    padding: '0',
    margin: '0',
    listStyle: 'none',
  },

  // Mobile-friendly modal styles
  mobileModal: {
    position: 'fixed' as const,
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
};

// Mobile performance monitoring
export const useMobilePerformanceMonitoring = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            setPerformanceMetrics(prev => ({
              ...prev,
              largestContentfulPaint: entry.startTime,
            }));
          }
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });

      // Get initial metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        setPerformanceMetrics(prev => ({
          ...prev,
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        }));
      }

      return () => observer.disconnect();
    }
  }, []);

  return { performanceMetrics };
};

// Export all utilities
export default {
  isMobileDevice,
  isTouchDevice,
  getDevicePixelRatio,
  useMobileOptimization,
  useTouchInteractions,
  useMobileGestures,
  useMobilePerformance,
  getMobileSpacing,
  getMobileFontSize,
  getMobileTouchTarget,
  useMobileScroll,
  useMobileImageOptimization,
  useMobileLazyLoading,
  useMobileBatteryOptimization,
  useMobileAccessibility,
  mobileStyles,
  useMobilePerformanceMonitoring,
};
