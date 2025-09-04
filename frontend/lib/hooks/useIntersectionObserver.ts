'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  IS_ROOT_MARGIN, IS_THRESHOLD
} from '@/lib/config/infiniteScroll.constants';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

type CallbackOptions = {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number;
  reinitOnPageShow?: boolean;
  onHiddenAbort?: AbortController | null;
};

// Single function with overloaded signatures
export function useIntersectionObserver(
  optionsOrCallback: UseIntersectionObserverOptions | ((entry: IntersectionObserverEntry) => void),
  callbackOpts?: CallbackOptions
) {
  // Always call hooks at the top level - these will be used for both APIs
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  // Create setTarget function at top level
  const setTarget = useCallback((el: HTMLElement | null) => { 
    targetRef.current = el; 
    if (observerRef.current && el) observerRef.current.observe(el); 
  }, []);
  
  // Single useEffect that handles both API cases
  useEffect(() => {
    const isCallbackAPI = typeof optionsOrCallback === 'function';
    
    if (isCallbackAPI) {
      // Handle callback API
      const onIntersect = optionsOrCallback as (entry: IntersectionObserverEntry) => void;
      const opts = callbackOpts || {};

      const rootMargin = opts.rootMargin ?? IS_ROOT_MARGIN;
      const threshold = opts.threshold ?? IS_THRESHOLD;

      const io = new IntersectionObserver((entries) => {
        // Only consider first entry for sentinel
        const entry = entries[0];
        if (entry?.isIntersecting) onIntersect(entry);
      }, { root: opts.root ?? null, rootMargin, threshold });

      observerRef.current = io;
      if (targetRef.current) io.observe(targetRef.current);

      // bfcache re-init
      const onPageShow = (e: PageTransitionEvent) => {
        if (opts.reinitOnPageShow && e.persisted) {
          io.disconnect();
          if (targetRef.current) io.observe(targetRef.current);
        }
      };
      window.addEventListener('pageshow', onPageShow);

      // Abort pending work when tab hidden (optional)
      const onVis = () => {
        if (document.visibilityState === 'hidden' && opts.onHiddenAbort) {
          opts.onHiddenAbort.abort('visibility-hidden');
        }
      };
      document.addEventListener('visibilitychange', onVis);

      return () => {
        window.removeEventListener('pageshow', onPageShow);
        document.removeEventListener('visibilitychange', onVis);
        io.disconnect();
      };
    } else {
      // Handle original API
      const options = optionsOrCallback as UseIntersectionObserverOptions;
      const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
      
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
    }
  }, [optionsOrCallback, callbackOpts, hasTriggered]);
  
  // Return appropriate API based on type
  if (typeof optionsOrCallback === 'function') {
    return { setTarget };
  } else {
    return { ref, isIntersecting };
  }
} 