import { useRef, useState, useCallback, useEffect } from 'react';

interface UseLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseLazyLoadingReturn {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
  hasTriggered: boolean;
}

/**
 * Custom hook for implementing intersection observer-based lazy loading
 * 
 * @param options - Configuration options for the intersection observer
 * @returns Object containing ref, visibility state, and trigger state
 * 
 * @example
 * ```tsx
 * const { ref, isVisible } = useLazyLoading();
 * 
 * return (
 *   <div ref={ref}>
 *     {isVisible && <HeavyComponent />}
 *   </div>
 * );
 * ```
 */
export function useLazyLoading(options: UseLazyLoadingOptions = {}): UseLazyLoadingReturn {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const entry = entries[0];
    
    if (entry && entry.isIntersecting) {
      setIsVisible(true);
      if (triggerOnce) {
        setHasTriggered(true);
      }
    } else if (!triggerOnce) {
      setIsVisible(false);
    }
  }, [triggerOnce]);

  useEffect(() => {
    const element = ref.current;
    
    // Guard against null/undefined elements and ensure it's a valid Element
    if (!element || !(element instanceof Element) || hasTriggered) {
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin
    });

    // Guard before observe call
    if (element && element instanceof Element) {
      observer.observe(element);
    }

    return () => {
      // Guard before unobserve call
      if (element && element instanceof Element) {
        observer.unobserve(element);
      }
    };
  }, [handleIntersection, threshold, rootMargin, hasTriggered]);

  return { ref, isVisible, hasTriggered };
}

/**
 * Hook for lazy loading images with progressive loading
 */
export function useLazyImage(options: UseLazyLoadingOptions = {}) {
  const { ref, isVisible } = useLazyLoading(options);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  return {
    ref,
    isVisible,
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError
  };
}

/**
 * Hook for lazy loading components with loading states
 */
export function useLazyComponent(options: UseLazyLoadingOptions = {}) {
  const { ref, isVisible } = useLazyLoading(options);
  const [componentLoaded, setComponentLoaded] = useState(false);

  useEffect(() => {
    if (isVisible && !componentLoaded) {
      // Small delay to ensure smooth loading
      const timer = setTimeout(() => {
        setComponentLoaded(true);
      }, 100);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, componentLoaded]);

  return {
    ref,
    isVisible,
    componentLoaded
  };
}
