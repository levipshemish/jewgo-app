'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronUp } from 'lucide-react';
import { scrollToTop } from '@/lib/utils/scrollUtils';

interface ScrollToTopProps {
  threshold?: number; // Viewport/container height multiplier to show button
  className?: string;
  testMode?: boolean; // For testing - bypasses scroll listener
  initialVisible?: boolean; // For testing - sets initial visibility
  showAfterRows?: number; // Show button only after this many rows are loaded
  totalRows?: number; // Total number of rows currently loaded
  containerSelector?: string; // Optional scroll container (defaults to window)
  position?: 'bottom-right' | 'right-center'; // Button position preset
  bottomOffsetPx?: number; // Extra offset from bottom when bottom-right
  size?: 'default' | 'compact'; // Visual size preset
  appearance?: 'solid' | 'translucent'; // Visual style preset
  strategy?: 'fixed' | 'absolute'; // Positioning strategy
}

export const ScrollToTop: React.FC<ScrollToTopProps> = ({
  threshold = 0.3,
  className = '',
  testMode = false,
  initialVisible = false,
  showAfterRows = 5,
  totalRows = 0,
  containerSelector,
  position = 'bottom-right',
  bottomOffsetPx = 96, // keep clear of BottomNavigation
  size = 'default',
  appearance = 'solid',
  strategy = 'fixed',
}) => {
  const [isVisible, setIsVisible] = useState(initialVisible);

  // Resolve container element once on mount (client only)
  const container: HTMLElement | null = useMemo(() => {
    if (typeof window === 'undefined') return null;
    if (!containerSelector) return null;
    try {
      return document.querySelector(containerSelector);
    } catch {
      return null;
    }
  }, [containerSelector]);

  useEffect(() => {
    if (testMode) {
      // In test mode, calculate visibility immediately using window
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const viewportHeight = window.innerHeight;
      const showThreshold = viewportHeight * threshold;
      setIsVisible(scrollTop > showThreshold);
      return;
    }

    const getScrollTop = () => (container ? container.scrollTop : (window.pageYOffset || document.documentElement.scrollTop));
    const getViewport = () => (container ? container.clientHeight : window.innerHeight);

    const recompute = () => {
      const scrollTop = getScrollTop();
      const viewportHeight = getViewport();
      const showThreshold = viewportHeight * threshold;
      setIsVisible(scrollTop > showThreshold);
    };

    // Initial computation (covers page already scrolled or container scrolled)
    recompute();

    // Use passive listener for better performance
    const target: HTMLElement | Window = container || window;
    target.addEventListener('scroll', recompute as EventListener, { passive: true } as AddEventListenerOptions);
    return () => target.removeEventListener('scroll', recompute as EventListener);
  }, [threshold, testMode, container]);

  const handleClick = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (container) {
      container.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    } else {
      scrollToTop(prefersReducedMotion ? 'auto' : 'smooth');
    }
  };

  // Don't show button if not enough rows are loaded
  if (totalRows < showAfterRows) return null;
  if (!isVisible) return null;

  const baseClasses = [
    `${strategy} z-50`,
    position === 'bottom-right'
      ? `right-4 md:right-6` // horizontal offset
      : 'top-1/2 right-6 -translate-y-1/2',
    // Size
    size === 'compact' ? 'w-11 h-11 md:w-12 md:h-12' : 'w-14 h-14',
    // Appearance
    appearance === 'translucent'
      ? 'bg-white/60 dark:bg-black/40 text-black dark:text-white border border-white/70 dark:border-white/10 backdrop-blur-sm shadow-md'
      : 'bg-green-600 hover:bg-green-700 text-white shadow-xl',
    'rounded-full',
    'transition-all duration-200 ease-in-out hover:scale-105 active:scale-95',
    'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} ${className}`}
      style={
        position === 'bottom-right'
          ? { bottom: bottomOffsetPx, marginBottom: 'env(safe-area-inset-bottom)' }
          : undefined
      }
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <ChevronUp size={size === 'compact' ? 20 : 24} className="mx-auto" />
    </button>
  );
};
