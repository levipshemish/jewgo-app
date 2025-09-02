'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { scrollToTop } from '@/lib/utils/scrollUtils';

interface ScrollToTopProps {
  threshold?: number; // Viewport height multiplier to show button
  className?: string;
  testMode?: boolean; // For testing - bypasses scroll listener
  initialVisible?: boolean; // For testing - sets initial visibility
}

export const ScrollToTop: React.FC<ScrollToTopProps> = ({ 
  threshold = 0.3, // Show after scrolling just 30% of viewport height
  className = '',
  testMode = false,
  initialVisible = false
}) => {
  const [isVisible, setIsVisible] = useState(initialVisible);

  useEffect(() => {
    if (testMode) {
      // In test mode, calculate visibility immediately
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const viewportHeight = window.innerHeight;
      const showThreshold = viewportHeight * threshold;
      setIsVisible(scrollTop > showThreshold);
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const viewportHeight = window.innerHeight;
      const showThreshold = viewportHeight * threshold;
      
      setIsVisible(scrollTop > showThreshold);
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold, testMode]);

  const handleClick = () => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollToTop(prefersReducedMotion ? 'auto' : 'smooth');
  };

  if (!isVisible) return null;

            return (
            <button
              onClick={handleClick}
              className={`
                fixed bottom-32 right-6 z-50
                w-14 h-14 rounded-full
                bg-green-600 hover:bg-green-700 
                text-white shadow-xl
                transition-all duration-200 ease-in-out
                hover:scale-110 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                ${className}
              `}
              aria-label="Scroll to top"
              title="Scroll to top"
            >
              <ChevronUp size={24} className="mx-auto" />
            </button>
          );
};
