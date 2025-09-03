import { useState, useEffect, useCallback, useMemo } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  breakpoint: number;
}

export interface UseDeviceDetectionOptions {
  breakpoints?: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  debounceMs?: number;
  includeOrientation?: boolean;
  includeTouch?: boolean;
}

const DEFAULT_BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useDeviceDetection(options: UseDeviceDetectionOptions = {}): DeviceInfo {
  const {
    breakpoints = DEFAULT_BREAKPOINTS,
    debounceMs = 100,
    includeOrientation = true,
    includeTouch = true,
  } = options;

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouch: false,
    orientation: 'portrait',
    screenSize: 'md',
    breakpoint: 768,
  }));

  // Memoized breakpoint calculation
  const calculateBreakpoint = useCallback((width: number): { screenSize: DeviceInfo['screenSize']; breakpoint: number } => {
    if (width >= breakpoints['2xl']) return { screenSize: '2xl', breakpoint: breakpoints['2xl'] };
    if (width >= breakpoints.xl) return { screenSize: 'xl', breakpoint: breakpoints.xl };
    if (width >= breakpoints.lg) return { screenSize: 'lg', breakpoint: breakpoints.lg };
    if (width >= breakpoints.md) return { screenSize: 'md', breakpoint: breakpoints.md };
    if (width >= breakpoints.sm) return { screenSize: 'sm', breakpoint: breakpoints.sm };
    return { screenSize: 'xs', breakpoint: breakpoints.xs };
  }, [breakpoints]);

  // Memoized device type calculation
  const calculateDeviceType = useCallback((width: number) => {
    const isMobile = width < breakpoints.md;
    const isTablet = width >= breakpoints.md && width < breakpoints.lg;
    const isDesktop = width >= breakpoints.lg;
    
    return { isMobile, isTablet, isDesktop };
  }, [breakpoints]);

  // Debounced update function
  const updateDeviceInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const { screenSize, breakpoint } = calculateBreakpoint(width);
    const { isMobile, isTablet, isDesktop } = calculateDeviceType(width);
    
    const orientation: 'portrait' | 'landscape' = width > height ? 'landscape' : 'portrait';
    const isTouch = includeTouch ? ('ontouchstart' in window || navigator.maxTouchPoints > 0) : false;

    setDeviceInfo({
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      orientation,
      screenSize,
      breakpoint,
    });
  }, [calculateBreakpoint, calculateDeviceType, includeTouch]);

  // Effect for initial setup and event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial calculation
    updateDeviceInfo();

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDeviceInfo, debounceMs);
    };

    // Orientation change handler
    const handleOrientationChange = () => {
      if (includeOrientation) {
        // Small delay to ensure dimensions are updated
        setTimeout(updateDeviceInfo, 100);
      }
    };

    // Add event listeners
    window.addEventListener('resize', handleResize, { passive: true });
    
    if (includeOrientation) {
      window.addEventListener('orientationchange', handleOrientationChange);
    }

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      if (includeOrientation) {
        window.removeEventListener('orientationchange', handleOrientationChange);
      }
    };
  }, [updateDeviceInfo, debounceMs, includeOrientation]);

  // Memoized utility functions
  const utilities = useMemo(() => ({
    // Check if current screen size matches or is larger than given size
    isAtLeast: (size: keyof typeof breakpoints) => {
      const currentIndex = Object.values(breakpoints).indexOf(deviceInfo.breakpoint);
      const targetIndex = Object.values(breakpoints).indexOf(breakpoints[size]);
      return currentIndex >= targetIndex;
    },
    
    // Check if current screen size is smaller than given size
    isSmallerThan: (size: keyof typeof breakpoints) => {
      const currentIndex = Object.values(breakpoints).indexOf(deviceInfo.breakpoint);
      const targetIndex = Object.values(breakpoints).indexOf(breakpoints[size]);
      return currentIndex < targetIndex;
    },
    
    // Get responsive value based on screen size
    getResponsiveValue: <T>(values: Partial<Record<keyof typeof breakpoints, T>>, fallback: T): T => {
      // Try to find the best matching value, starting from current size and going down
      const sizes = Object.keys(breakpoints) as (keyof typeof breakpoints)[];
      const currentIndex = sizes.indexOf(deviceInfo.screenSize);
      
      for (let i = currentIndex; i >= 0; i--) {
        const size = sizes[i];
        if (values[size] !== undefined) {
          return values[size]!;
        }
      }
      
      return fallback;
    },
  }), [deviceInfo.breakpoint, deviceInfo.screenSize, breakpoints]);

  return {
    ...deviceInfo,
    ...utilities,
  };
}

// Convenience hooks for common use cases
export function useIsMobile(): boolean {
  return useDeviceDetection().isMobile;
}

export function useIsTablet(): boolean {
  return useDeviceDetection().isTablet;
}

export function useIsDesktop(): boolean {
  return useDeviceDetection().isDesktop;
}

export function useIsTouch(): boolean {
  return useDeviceDetection().isTouch;
}

export function useOrientation(): 'portrait' | 'landscape' {
  return useDeviceDetection({ includeOrientation: true }).orientation;
}

export function useScreenSize(): DeviceInfo['screenSize'] {
  return useDeviceDetection().screenSize;
}
