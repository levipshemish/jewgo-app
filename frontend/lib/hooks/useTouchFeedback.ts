import React, { useCallback, useRef, useEffect } from 'react';

import { getTouchStyles, isMobileDevice } from '@/lib/utils/touchUtils';

interface TouchFeedbackOptions {
  scale?: number;
  opacity?: number;
  duration?: number;
  preventDoubleTap?: boolean;
}

interface TouchFeedbackReturn {
  touchStyles: React.CSSProperties;
  handleTouchStart: () => void;
  handleTouchEnd: () => void;
  handleTouchCancel: () => void;
  ref: React.RefObject<HTMLElement>;
}

export const useTouchFeedback = (options: TouchFeedbackOptions = {}): TouchFeedbackReturn => {
  const {
    scale = 0.98,
    opacity = 0.8,
    duration = 100,
    preventDoubleTap = true
  } = options;
  const ref = useRef<HTMLElement>(null);
  const isMobile = isMobileDevice();

  const touchStyles = getTouchStyles();

  const handleTouchStart = useCallback(() => {
    if (!isMobile || !ref.current) {
      return;
    }
    
    ref.current.style.transform = `scale(${scale})`;
    ref.current.style.opacity = opacity.toString();
    ref.current.style.transition = `all ${duration}ms ease-out`;
  }, [isMobile, scale, opacity, duration]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !ref.current) {
      return;
    }
    
    ref.current.style.transform = 'scale(1)';
    ref.current.style.opacity = '1';
  }, [isMobile]);

  const handleTouchCancel = useCallback(() => {
    if (!isMobile || !ref.current) {
      return;
    }
    
    ref.current.style.transform = 'scale(1)';
    ref.current.style.opacity = '1';
  }, [isMobile]);

  // Prevent double-tap zoom
  useEffect(() => {
    if (!isMobile || !ref.current || !preventDoubleTap) {
      return;
    }

    let lastTouchEnd = 0;
    const element = ref.current;

    const preventDoubleTapHandler = (event: TouchEvent) => {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };

    element.addEventListener('touchend', preventDoubleTapHandler, { passive: false });

    return () => {
      element.removeEventListener('touchend', preventDoubleTapHandler);
    };
  }, [isMobile, preventDoubleTap]);

  return {
    touchStyles,
    handleTouchStart,
    handleTouchEnd,
    handleTouchCancel,
    ref
  };
};

/**
 * Enhanced touch handler with immediate feedback
 */
export const useEnhancedTouch = () => {
  const isMobile = isMobileDevice();

  const handleTouch = useCallback((
    handler: () => void,
    options: {
      preventDefault?: boolean;
      stopPropagation?: boolean;
      immediate?: boolean;
    } = {}
  ) => {
    const {
      preventDefault = false,
      stopPropagation = false,
      immediate = true
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
      if ('touches' in e && isMobile) {
        setTimeout(() => {
          handler();
        }, 50); // Reduced delay
      } else {
        handler();
      }
    };
  }, [isMobile]);

  return {
    handleTouch,
    isMobile
  };
};