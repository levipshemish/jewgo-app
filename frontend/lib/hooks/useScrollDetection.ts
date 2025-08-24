import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollDetectionOptions {
  threshold?: number;
  debounceMs?: number;
  enableBodyClass?: boolean;
}

export function useScrollDetection(options: UseScrollDetectionOptions = {}) {
  const {
    threshold = 0,
    debounceMs = 100,
    enableBodyClass = true
  } = options;

  const [isScrolling, setIsScrolling] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Only trigger if scroll amount exceeds threshold
    if (Math.abs(currentScrollY - lastScrollY.current) > threshold) {
      if (!isScrolling) {
        setIsScrolling(true);
        if (enableBodyClass) {
          document.body.classList.add('scrolling');
        }
      }
      
      lastScrollY.current = currentScrollY;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      if (enableBodyClass) {
        document.body.classList.remove('scrolling');
      }
    }, debounceMs);
  }, [isScrolling, threshold, debounceMs, enableBodyClass]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (enableBodyClass) {
        document.body.classList.remove('scrolling');
      }
    };
  }, [handleScroll, enableBodyClass]);

  return { isScrolling };
}
