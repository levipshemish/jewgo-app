"use client";
import React, { useEffect, useRef, useState, useCallback, useContext, createContext } from 'react';

interface UseScrollDetectionOptions {
  threshold?: number;
  debounceMs?: number;
  enableBodyClass?: boolean;
  // Add option to disable scroll detection for performance
  disabled?: boolean;
}

// Create a shared scroll context to prevent multiple listeners
interface ScrollContextType {
  isScrolling: boolean;
  addListener: (callback: (isScrolling: boolean) => void) => () => void;
}

const ScrollContext = createContext<ScrollContextType | null>(null);

// Provider component for shared scroll state
export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const [contextIsScrolling, setContextIsScrolling] = useState(false);
  const listeners = useRef<Set<(isScrolling: boolean) => void>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollY = useRef(0);
  const scrollStartTime = useRef(0);
  const isScrollingRef = useRef(false);

  const addListener = useCallback((callback: (isScrolling: boolean) => void) => {
    listeners.current.add(callback);
    return () => {
      listeners.current.delete(callback);
    };
  }, []);

  const notifyListeners = useCallback((scrolling: boolean) => {
    listeners.current.forEach(callback => callback(scrolling));
  }, []);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const currentTime = Date.now();
    
    // Only trigger if scroll amount exceeds threshold
    if (Math.abs(currentScrollY - lastScrollY.current) > 5) {
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setContextIsScrolling(true);
        scrollStartTime.current = currentTime;
        notifyListeners(true);
        
        document.body.classList.add('scrolling');
      }
      
      lastScrollY.current = currentScrollY;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout with improved logic
    timeoutRef.current = setTimeout(() => {
      // Only stop scrolling if enough time has passed since last scroll
      const timeSinceLastScroll = currentTime - scrollStartTime.current;
      if (timeSinceLastScroll >= 150) {
        isScrollingRef.current = false;
        setContextIsScrolling(false);
        notifyListeners(false);
        document.body.classList.remove('scrolling');
      }
    }, 150);
  }, [notifyListeners]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      document.body.classList.remove('scrolling');
    };
  }, [handleScroll]);

  return (
    <ScrollContext.Provider value={{ isScrolling: contextIsScrolling, addListener }}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScrollDetection(options: UseScrollDetectionOptions = {}) {
  const {
    threshold = 5, // Reduced threshold to be more responsive
    debounceMs = 150, // Increased debounce for smoother transitions
    enableBodyClass = true,
    disabled = false
  } = options;

  const context = useContext(ScrollContext);
  const [isScrolling, setIsScrolling] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollY = useRef(0);
  const scrollStartTime = useRef(0);
  const isScrollingRef = useRef(false); // Use ref to avoid stale closures

  // Use shared context if available, otherwise fall back to local detection
  useEffect(() => {
    if (context && !disabled) {
      return context.addListener(setIsScrolling);
    }
  }, [context, disabled]);

  const handleScroll = useCallback(() => {
    if (disabled || context) return; // Skip if using shared context
    
    const currentScrollY = window.scrollY;
    const currentTime = Date.now();
    
    // Only trigger if scroll amount exceeds threshold
    if (Math.abs(currentScrollY - lastScrollY.current) > threshold) {
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setIsScrolling(true);
        scrollStartTime.current = currentTime;
        
        if (enableBodyClass) {
          document.body.classList.add('scrolling');
        }
      }
      
      lastScrollY.current = currentScrollY;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout with improved logic
    timeoutRef.current = setTimeout(() => {
      // Only stop scrolling if enough time has passed since last scroll
      const timeSinceLastScroll = currentTime - scrollStartTime.current;
      if (timeSinceLastScroll >= debounceMs) {
        isScrollingRef.current = false;
        setIsScrolling(false);
        if (enableBodyClass) {
          document.body.classList.remove('scrolling');
        }
      }
    }, debounceMs);
  }, [threshold, debounceMs, enableBodyClass, disabled, context]);

  useEffect(() => {
    if (disabled || context) return; // Skip if using shared context
    
    // Use passive listener for better performance
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
  }, [handleScroll, enableBodyClass, disabled, context]);

  // Return shared context state if available, otherwise local state
  return { isScrolling: context ? context.isScrolling : isScrolling };
}
