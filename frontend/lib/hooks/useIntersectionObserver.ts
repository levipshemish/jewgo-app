'use client';

import { useRef, useState, useEffect } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}) => {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    
    // Guard against null/undefined elements and ensure it's a valid Element
    if (!element || !(element instanceof Element)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {return;}
        
        const isElementIntersecting = entry.isIntersecting;
        
        if (triggerOnce && hasTriggered) {
          return;
        }

        if (isElementIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            setHasTriggered(true);
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

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
  }, [threshold, rootMargin, triggerOnce, hasTriggered]);

  return { ref, isIntersecting };
}; 