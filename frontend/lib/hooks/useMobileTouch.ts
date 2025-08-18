import { useCallback } from 'react';

interface TouchHandlerOptions {
  delay?: number;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  immediate?: boolean; // New option for immediate execution
}

export const useMobileTouch = () => {
  const handleTouch = useCallback((
    handler: () => void,
    options: TouchHandlerOptions = {}
  ) => {
    const {
      delay = 0, // No delay by default for better responsiveness
      preventDefault = false,
      stopPropagation = false,
      immediate = true // Execute immediately by default
    } = options;

    return (e: React.MouseEvent | React.TouchEvent) => {
      if (preventDefault) {
        e.preventDefault();
      }
      if (stopPropagation) {
        e.stopPropagation();
      }

      // Execute immediately for better responsiveness
      if (immediate) {
        handler();
        return;
      }

      // Only add delay for touch events on mobile if not immediate
      if ('touches' in e && typeof window !== 'undefined' && 'ontouchstart' in window) {
        setTimeout(() => {
          handler();
        }, delay);
      } else {
        handler();
      }
    };
  }, []);

  const isMobile = useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Enhanced touch handler with immediate feedback
  const handleImmediateTouch = useCallback((
    handler: () => void,
    options: Omit<TouchHandlerOptions, 'immediate'> = {}
  ) => {
    return (e?: React.MouseEvent | React.TouchEvent) => {
      const {
        preventDefault = false,
        stopPropagation = false
      } = options;

      if (e) {
        if (preventDefault) {
          e.preventDefault();
        }
        if (stopPropagation) {
          e.stopPropagation();
        }
      }

      // Execute immediately
      handler();
    };
  }, []);

  return {
    handleTouch,
    handleImmediateTouch,
    isMobile: isMobile()
  };
};
