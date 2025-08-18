/**
 * Touch utilities for mobile optimization
 */

export const TOUCH_TARGET_SIZE = 44; // Minimum touch target size in pixels

/**
 * Check if the current device supports touch
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Check if the current device is mobile
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.innerWidth <= 768 || isTouchDevice();
};

/**
 * Get optimal touch target size based on device
 */
export const getTouchTargetSize = (): number => {
  return isMobileDevice() ? TOUCH_TARGET_SIZE : 32;
};

/**
 * Create touch-friendly styles for elements
 */
export const getTouchStyles = (customSize?: number) => {
  const size = customSize || getTouchTargetSize();
  
  return {
    minHeight: `${size}px`,
    minWidth: `${size}px`,
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none' as const,
    WebkitUserSelect: 'none' as const,
    userSelect: 'none' as const,
    transition: 'all 0.1s ease-out',
  };
};

/**
 * Debounce function for touch events to prevent double-taps
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for touch events
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Prevent double-tap zoom on mobile
 */
export const preventDoubleTapZoom = (element: HTMLElement): void => {
  let lastTouchEnd = 0;
  
  element.addEventListener('touchend', (event) => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false }); // This needs to be non-passive to call preventDefault()
};

/**
 * Add touch feedback to an element
 */
export const addTouchFeedback = (element: HTMLElement): void => {
  element.addEventListener('touchstart', () => {
    element.style.transform = 'scale(0.98)';
    element.style.opacity = '0.8';
  }, { passive: true });
  
  element.addEventListener('touchend', () => {
    element.style.transform = 'scale(1)';
    element.style.opacity = '1';
  }, { passive: true });
  
  element.addEventListener('touchcancel', () => {
    element.style.transform = 'scale(1)';
    element.style.opacity = '1';
  }, { passive: true });
};

/**
 * Remove touch feedback from an element
 */
export const removeTouchFeedback = (element: HTMLElement): void => {
  element.removeEventListener('touchstart', () => {});
  element.removeEventListener('touchend', () => {});
  element.removeEventListener('touchcancel', () => {});
};