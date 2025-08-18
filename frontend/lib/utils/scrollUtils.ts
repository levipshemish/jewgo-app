/**
 * Scroll to the top of the page with smooth animation
 * @param behavior - Scroll behavior ('smooth' | 'auto' | 'instant')
 */
export function scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  // Method 1: scrollIntoView on body
  document.body.scrollIntoView({
    behavior,
    block: 'start',
    inline: 'nearest'
  });

  // Method 2: window.scrollTo with behavior
  window.scrollTo({
    top: 0,
    behavior
  });

  // Method 3: Fallback for browsers that don't support smooth scrolling
  window.scrollTo(0, 0);
}

/**
 * Scroll to a specific element with smooth animation
 * @param element - The element to scroll to
 * @param offset - Additional offset from the top
 * @param behavior - Scroll behavior
 */
export function scrollToElement(
  element: HTMLElement, offset: number = 0, behavior: ScrollBehavior = 'smooth'): void {
  const elementPosition = element.offsetTop - offset;
  window.scrollTo({
    top: elementPosition,
    behavior
  });
}

/**
 * Check if user is on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.innerWidth < 768; // md breakpoint
}

/**
 * Get current scroll position
 * @returns Current scroll position in pixels
 */
export function getScrollPosition(): number {
  // Use pageYOffset for better browser compatibility
  return window.pageYOffset || document.documentElement.scrollTop;
}

/**
 * Throttled scroll handler to reduce forced reflows
 * @param callback - Function to call on scroll
 * @param delay - Throttle delay in milliseconds
 * @returns Throttled function
 */
export function createThrottledScrollHandler(
  callback: (scrollPosition: number) => void,
  delay: number = 16 // ~60fps
): (event: Event) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (event: Event) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      // Use requestAnimationFrame to batch layout reads
      requestAnimationFrame(() => {
        callback(getScrollPosition());
      });
    } else if (!timeoutId) {
      // Ensure we don't miss the last scroll event
      timeoutId = setTimeout(() => {
        timeoutId = null;
        requestAnimationFrame(() => {
          callback(getScrollPosition());
        });
      }, delay - (now - lastCall));
    }
  };
}

/**
 * Throttled resize handler to reduce forced reflows
 * @param callback - Function to call on resize
 * @param delay - Throttle delay in milliseconds
 * @returns Throttled function
 */
export function createThrottledResizeHandler(
  callback: (width: number, height: number) => void,
  delay: number = 100
): (event: Event) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (event: Event) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      // Use requestAnimationFrame to batch layout reads
      requestAnimationFrame(() => {
        callback(window.innerWidth, window.innerHeight);
      });
    } else if (!timeoutId) {
      // Ensure we don't miss the last resize event
      timeoutId = setTimeout(() => {
        timeoutId = null;
        requestAnimationFrame(() => {
          callback(window.innerWidth, window.innerHeight);
        });
      }, delay - (now - lastCall));
    }
  };
}

/**
 * Debounced scroll handler for performance-critical operations
 * @param callback - Function to call on scroll
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced function
 */
export function createDebouncedScrollHandler(
  callback: (scrollPosition: number) => void,
  delay: number = 150
): (event: Event) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (event: Event) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        callback(getScrollPosition());
      });
    }, delay);
  };
}

/**
 * Check if element is in viewport with throttled performance
 * @param element - Element to check
 * @param threshold - Intersection threshold (0-1)
 * @returns Promise that resolves to boolean
 */
export function isElementInViewport(
  element: HTMLElement, threshold: number = 0.1): Promise<boolean> {
  return new Promise((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          resolve(entry.isIntersecting);
        }
        observer.disconnect();
      },
      { threshold }
    );
    
    observer.observe(element);
  });
}

/**
 * Get element dimensions with performance optimization
 * @param element - Element to measure
 * @returns Object with width, height, and position
 */
export function getElementDimensions(element: HTMLElement) {
  // Use getBoundingClientRect for better performance
  const rect = element.getBoundingClientRect();
  
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset,
    bottom: rect.bottom + window.pageYOffset,
    right: rect.right + window.pageXOffset
  };
}
